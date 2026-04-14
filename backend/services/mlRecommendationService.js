const axios = require("axios");
const { getCache, setCache } = require("./cacheService");

const client = axios.create({
  baseURL: process.env.ML_SERVICE_URL || "http://127.0.0.1:8001",
  timeout: 8000,
});
const AUTO_TRAIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const AUTO_TRAIN_MIN_PRODUCTS = 50;
const HYBRID_RULE_WEIGHT = 0.4;
const HYBRID_ML_WEIGHT = 0.6;
let lastTrainAt = 0;

function normalizePreferredBrands(brands = []) {
  return (Array.isArray(brands) ? brands : [brands])
    .map((brand) => String(brand || "").trim().toLowerCase())
    .filter(Boolean);
}

function scoreRuleProduct(product, user = {}) {
  const maxPrice = Math.max(Number(user.maxPrice || user.budget) || 0, 1);
  const preferredBrands = normalizePreferredBrands(user.preferredBrands || user.brands);
  const price = Number(product?.bestPrice ?? product?.price) || maxPrice;
  const rating = Number(product?.rating) || 0;
  const popularity = Number(product?.popularity) || 0;
  const brand = String(product?.uniqueKey || product?.brand || "").toLowerCase();
  const category = String(product?.category || "").toLowerCase();
  const requestedCategory = String(user?.category || "").toLowerCase();
  const featureMatch = Array.isArray(product?.features)
    ? product.features.filter((feature) =>
        Array.isArray(user?.features)
          ? user.features.some(
              (requestedFeature) =>
                String(feature).toLowerCase() === String(requestedFeature).toLowerCase()
            )
          : false
      ).length
    : 0;

  let score = 0;
  score += Math.max(0, 1 - price / maxPrice) * 0.30;
  score += Math.max(0, Math.min(1, rating / 5)) * 0.25;

  if (preferredBrands.includes(brand)) {
    score += 0.20;
  }

  if (requestedCategory && category === requestedCategory) {
    score += 0.15;
  }

  score += Math.max(0, Math.min(1, popularity / 100)) * 0.07;
  score += Math.max(0, Math.min(1, featureMatch / 4)) * 0.03;

  if (rating > 4.5) {
    score += 0.1;
  }

  if (Number(product?.discountPercentage || product?.discount || 0) > 0) {
    score += 0.05;
  }

  if (popularity >= 80) {
    score += 0.05;
  }

  return Number(Math.max(0, Math.min(1, score)).toFixed(4));
}

async function trainMlModel(products = []) {
  const safeProducts = (Array.isArray(products) ? products : []).filter(Boolean);
  const categoryAverages = buildCategoryAverageMap(safeProducts);
  const brandPopularity = buildBrandPopularityMap(safeProducts);
  const validProducts = safeProducts.filter((product) => {
    const price = Number(product?.bestPrice ?? product?.price);
    const rating = Number(product?.rating);
    return (
      Number.isFinite(price) &&
      price > 0 &&
      Number.isFinite(rating) &&
      rating > 0 &&
      String(product?.brandName || product?.brand || "").trim() &&
      String(product?.category || "").trim()
    );
  });

  console.log(`ML training records: total=${safeProducts.length} valid=${validProducts.length}`);

  if (validProducts.length < AUTO_TRAIN_MIN_PRODUCTS) {
    return { trained: false, skipped: true, total: safeProducts.length, valid: validProducts.length };
  }

  try {
    const response = await client.post("/ml/train", {
      products: validProducts.map((product) => ({
        id: product?._id || product?.id || product?.uniqueKey,
        price: parseInt(Number(product?.bestPrice ?? product?.price) || 0, 10),
        rating: Number(Number(product?.rating) || 0),
        category: product?.category || "Other",
        brand: product?.brandName || product?.uniqueKey || product?.brand || "generic",
        clicks: Number(product?.clicks) || 0,
        popularity_score: Number(product?.popularity) || 0,
        discount: Number(product?.discountPercentage) || 0,
        price_vs_category_avg: getPriceVsCategoryAvg(product, categoryAverages),
        brand_popularity_index: getBrandPopularityIndex(product, brandPopularity),
      })),
    });
    lastTrainAt = Date.now();
    return response.data;
  } catch (error) {
    console.error("ML training failed:", error.message);
    return { trained: false, error: error.message };
  }
}

async function maybeTrainMlModel(products = []) {
  if (Date.now() - lastTrainAt < AUTO_TRAIN_INTERVAL_MS) {
    return { trained: false, skipped: true };
  }

  return trainMlModel(products);
}

async function getMlScores(products = [], user = {}) {
  const safeProducts = Array.isArray(products) ? products : [];

  if (safeProducts.length === 0) {
    return [];
  }

  const cacheKey = `ml:${JSON.stringify({
    user,
    ids: safeProducts.map((product) => product?._id || product?.id || product?.uniqueKey),
  })}`;
  const cached = getCache(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const categoryAverages = buildCategoryAverageMap(safeProducts);
    const brandPopularity = buildBrandPopularityMap(safeProducts);
    const response = await client.post("/ml/predict", {
      user,
      products: safeProducts.map((product) => ({
        id: product?._id || product?.id || product?.uniqueKey,
        price: parseInt(Number(product?.bestPrice ?? product?.price) || 0, 10),
        rating: Number(Number(product?.rating) || 0),
        category: product?.category || "Other",
        brand: product?.brandName || product?.uniqueKey || product?.brand || "generic",
        clicks: Number(product?.clicks ?? product?.popularity) || 0,
        popularity_score: Number(product?.popularity) || 0,
        discount: Number(product?.discountPercentage) || 0,
        price_vs_category_avg: getPriceVsCategoryAvg(product, categoryAverages),
        brand_popularity_index: getBrandPopularityIndex(product, brandPopularity),
      })),
    });

    return setCache(cacheKey, Array.isArray(response.data?.scores) ? response.data.scores : []);
  } catch (error) {
    console.error("ML service unavailable, falling back to rule engine:", error.message);
    return [];
  }
}

async function buildHybridRecommendations(products = [], user = {}) {
  const safeProducts = Array.isArray(products) ? products : [];
  const ruleScores = safeProducts.map((product) => ({
    id: product?._id || product?.id || product?.uniqueKey,
    ruleScore: scoreRuleProduct(product, user),
  }));
  const mlScores = await getMlScores(safeProducts, user);
  const mlMap = new Map(
    mlScores.map((entry) => [
      String(entry?.id),
      {
        score: Number(entry?.relevance_score) || 0,
        confidence: Number(entry?.confidence_score) || 0,
      },
    ])
  );

  return safeProducts
    .map((product) => {
      const id = String(product?._id || product?.id || product?.uniqueKey);
      const ruleScore = ruleScores.find((entry) => String(entry.id) === id)?.ruleScore || 0;
      const mlResult = mlMap.get(id) ?? null;
      const mlScore = mlResult?.score ?? null;
      const mlConfidence = mlResult?.confidence ?? null;
      const finalScore =
        mlScore === null
          ? ruleScore
          : Number(
              (
                HYBRID_RULE_WEIGHT * ruleScore +
                HYBRID_ML_WEIGHT * Math.max(0, Math.min(1, mlScore))
              ).toFixed(4)
            );
      let boostedFinalScore = finalScore;
      if ((Number(product?.rating) || 0) > 4.5) {
        boostedFinalScore += 0.1;
      }
      if (Number(product?.discountPercentage || product?.discount || 0) > 0) {
        boostedFinalScore += 0.05;
      }
      if ((Number(product?.popularity) || 0) >= 80) {
        boostedFinalScore += 0.05;
      }
      boostedFinalScore = Number(Math.max(0, Math.min(1, boostedFinalScore)).toFixed(4));

      const confidenceScore =
        mlScore === null
          ? Math.max(0.45, Math.min(0.8, Number((0.55 + ruleScore * 0.25).toFixed(4))))
          : Number(
              Math.max(
                0,
                Math.min(
                  1,
                  (
                    HYBRID_RULE_WEIGHT * Math.max(0.4, ruleScore) +
                    HYBRID_ML_WEIGHT * Math.max(0.35, mlConfidence || 0)
                  )
                )
              ).toFixed(4)
            );

      return {
        ...product,
        ruleScore: Number(ruleScore.toFixed(4)),
        mlScore: mlScore === null ? null : Number(Math.max(0, Math.min(1, mlScore)).toFixed(4)),
        confidenceScore,
        confidenceLevel: getConfidenceLevel(confidenceScore),
        finalScore: boostedFinalScore,
        aiScore: Number((Math.min(10, Math.max(0, boostedFinalScore * 10))).toFixed(2)),
      };
    })
    .sort((left, right) => (right.finalScore || 0) - (left.finalScore || 0));
}

function buildCategoryAverageMap(products = []) {
  const bucket = new Map();
  for (const product of products) {
    const key = String(product?.category || "Other").trim().toLowerCase();
    const price = Number(product?.bestPrice ?? product?.price);
    if (!Number.isFinite(price) || price <= 0) {
      continue;
    }
    const current = bucket.get(key) || { total: 0, count: 0 };
    current.total += price;
    current.count += 1;
    bucket.set(key, current);
  }
  return new Map(
    Array.from(bucket.entries()).map(([key, value]) => [key, value.count > 0 ? value.total / value.count : 0])
  );
}

function buildBrandPopularityMap(products = []) {
  const bucket = new Map();
  for (const product of products) {
    const key = String(product?.brandName || product?.brand || product?.uniqueKey || "generic")
      .trim()
      .toLowerCase();
    const popularity = Number(product?.popularity);
    if (!Number.isFinite(popularity)) {
      continue;
    }
    const current = bucket.get(key) || { total: 0, count: 0 };
    current.total += popularity;
    current.count += 1;
    bucket.set(key, current);
  }
  return new Map(
    Array.from(bucket.entries()).map(([key, value]) => [key, value.count > 0 ? value.total / value.count : 0])
  );
}

function getPriceVsCategoryAvg(product, categoryAverages) {
  const categoryKey = String(product?.category || "Other").trim().toLowerCase();
  const average = Number(categoryAverages.get(categoryKey)) || 0;
  const price = Number(product?.bestPrice ?? product?.price) || 0;
  if (average <= 0 || price <= 0) {
    return 0;
  }
  return Number((price / average).toFixed(4));
}

function getBrandPopularityIndex(product, brandPopularity) {
  const brandKey = String(product?.brandName || product?.brand || product?.uniqueKey || "generic")
    .trim()
    .toLowerCase();
  return Number((Number(brandPopularity.get(brandKey)) || Number(product?.popularity) || 0).toFixed(4));
}

function getConfidenceLevel(value = 0) {
  if (value >= 0.8) {
    return "High";
  }
  if (value >= 0.6) {
    return "Medium";
  }
  return "Low";
}

module.exports = {
  buildHybridRecommendations,
  getMlScores,
  maybeTrainMlModel,
  scoreRuleProduct,
  trainMlModel,
};
