const TRUSTED_BRANDS = ["nike", "adidas", "puma", "asics", "skechers"];

function analyzeReviews(reviews = []) {
  let positive = 0;
  let negative = 0;

  (Array.isArray(reviews) ? reviews : []).forEach((review) => {
    const text = String(review?.text || "").toLowerCase();

    if (
      text.includes("good") ||
      text.includes("comfortable") ||
      text.includes("best") ||
      text.includes("lightweight") ||
      text.includes("value")
    ) {
      positive += 1;
    }

    if (
      text.includes("bad") ||
      text.includes("poor") ||
      text.includes("tight") ||
      text.includes("heavy") ||
      text.includes("worst")
    ) {
      negative += 1;
    }
  });

  return {
    sentimentScore: positive - negative,
    positive,
    negative,
  };
}

function normalizeScore(value, maxValue) {
  const numeric = Number(value);
  const maxNumeric = Math.max(Number(maxValue) || 1, 1);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, numeric / maxNumeric));
}

function generateExplanation(product, reviewData, budget) {
  const reasons = [];
  const bestPrice = Number(product?.bestPrice ?? product?.price) || 0;
  const rating = Number(product?.rating) || 0;
  const popularity = Number(product?.popularity) || 0;
  const category = String(product?.category || "").toLowerCase();
  const requestedCategory = String(product?.requestedCategory || product?.userCategory || "").toLowerCase();
  const budgetValue = budget > 0 ? budget : 5000;
  const budgetMatch = budgetValue > 0 ? Math.max(0, Math.min(100, (1 - bestPrice / budgetValue) * 100)) : 0;

  if (budgetMatch >= 10 || bestPrice <= budgetValue) {
    reasons.push("Fits your budget");
  }

  if (rating >= 4.5) {
    reasons.push(`Highly rated (${rating.toFixed(2)})`);
  }

  if (popularity >= 80) {
    reasons.push(
      category === "running" ? "Popular among runners" : "Popular among active buyers"
    );
  }

  if (requestedCategory && requestedCategory === category) {
    reasons.push(`Best for ${category} category`);
  } else if (category === "running") {
    reasons.push("Good for daily training and running");
  }

  if ((reviewData?.positive || 0) > (reviewData?.negative || 0)) {
    reasons.push("Positive customer feedback");
  }

  return reasons.length > 0 ? reasons : ["Balanced option for everyday wear"];
}

function analyzePriceHistory(history = []) {
  const safeHistory = Array.isArray(history) ? history : [];
  if (safeHistory.length < 2) {
    return "Stable price trend";
  }

  const oldest = Number(safeHistory[0]?.price) || 0;
  const latest = Number(safeHistory[safeHistory.length - 1]?.price) || 0;

  if (latest < oldest) {
    return "Price dropped recently - good time to buy";
  }

  if (latest > oldest) {
    return "Price increasing - consider buying soon";
  }

  return "Stable price trend";
}

function getVerdict(aiScore) {
  if (aiScore >= 9) {
    return "Excellent choice - top-tier value";
  }

  if (aiScore >= 8) {
    return "Great buy - highly recommended";
  }

  if (aiScore >= 7) {
    return "Good option - worth considering";
  }

  if (aiScore >= 6) {
    return "Decent - but alternatives exist";
  }

  return "Consider alternatives";
}

function computeScore(product, userPreferences = {}) {
  const rating = Number(product?.rating) || 0;
  const popularity = Number(product?.popularity) || 0;
  const budget = Math.max(Number(userPreferences?.budget) || 0, 5000);
  const bestPrice = Number(product?.bestPrice ?? product?.price) || budget;
  const reviewData = analyzeReviews(product?.reviews);
  const brandBoost = TRUSTED_BRANDS.includes(String(product?.brand || "").toLowerCase()) ? 1 : 0;
  const ratingScore = (rating / 5) * 4;
  const priceScore = Math.max(0, 1 - bestPrice / Math.max(budget, 1)) * 3;
  const popularityScore = (popularity / 100) * 2;
  const reviewScore = Math.max(0, reviewData.sentimentScore) * 0.5;

  let totalScore =
    ratingScore +
    priceScore +
    popularityScore +
    reviewScore +
    brandBoost;

  if (rating >= 4.5 && bestPrice < budget * 0.8) {
    totalScore += 0.5;
  }

  return Math.min(10, Math.max(0, Number(totalScore.toFixed(2))));
}

function enrichProductWithAi(product, userPreferences = {}) {
  const budget = Math.max(Number(userPreferences?.budget) || 0, 5000);
  const reviewSummary = analyzeReviews(product?.reviews);
  const aiScore = Number(
    product?.aiScore ?? computeScore(product, { ...userPreferences, budget })
  );
  const finalScore = Number(product?.finalScore);
  const ruleScore = Number(product?.ruleScore);
  const mlScore = product?.mlScore === null || product?.mlScore === undefined
    ? null
    : Number(product.mlScore);
  const confidenceScore = Number(product?.confidenceScore);
  const bestPrice = Number(product?.bestPrice ?? product?.price) || 0;
  const budgetMatch = budget > 0
    ? Math.max(0, Math.min(100, Number((((budget - bestPrice) / budget) * 100 + 100).toFixed(0))))
    : 0;
  const confidenceLevel =
    product?.confidenceLevel ||
    (confidenceScore >= 0.8 ? "High" : confidenceScore >= 0.6 ? "Medium" : "Low");
  const explanation = generateExplanation(
    {
      ...product,
      requestedCategory: userPreferences?.category,
    },
    reviewSummary,
    budget
  );

  return {
    ...product,
    aiScore,
    finalScore: Number.isFinite(finalScore) ? Number(finalScore.toFixed(4)) : Number((aiScore / 10).toFixed(4)),
    ruleScore: Number.isFinite(ruleScore) ? Number(ruleScore.toFixed(4)) : Number(((aiScore / 10) * 0.8).toFixed(4)),
    mlScore: mlScore === null ? null : Number(mlScore.toFixed(4)),
    confidenceScore: Number.isFinite(confidenceScore) ? Number(confidenceScore.toFixed(4)) : 0.65,
    confidenceLevel,
    verdict: getVerdict(aiScore),
    recommendation: getVerdict(aiScore),
    explanation,
    reasons: explanation,
    reviewSummary: {
      positive: reviewSummary.positive,
      negative: reviewSummary.negative,
      sentimentScore: reviewSummary.sentimentScore,
    },
    priceInsight: analyzePriceHistory(product?.priceHistory),
    buyLink:
      product?.buyLink ||
      (Array.isArray(product?.prices)
        ? product.prices.find((entry) => entry?.link)?.link || ""
        : "") ||
      product?.link ||
      product?.url ||
      "",
  };
}

function rankProducts(products, userPreferences = {}) {
  const candidates = Array.isArray(products) ? products.slice(0, 100) : [];
  if (candidates.length === 0) {
    return [];
  }

  const baseRanked = candidates
    .map((product) => enrichProductWithAi(product, userPreferences))
    .sort((left, right) => right.aiScore - left.aiScore);

  return baseRanked;
}

function getSimilarProducts(product, allProducts = []) {
  if (!product) {
    return [];
  }

  const basePrice = Number(product.bestPrice ?? product.price) || 0;
  const minPrice = basePrice * 0.7;
  const maxPrice = basePrice * 1.3;
  const baseCategory = String(product.category || "").toLowerCase();
  const baseBrand = String(product.brand || "").toLowerCase();

  return allProducts
    .filter((candidate) => candidate && candidate.id !== product.id)
    .map((candidate) => {
      const candidatePrice = Number(candidate.bestPrice ?? candidate.price) || 0;
      const sameCategory =
        String(candidate.category || "").toLowerCase() === baseCategory;
      const sameBrand = String(candidate.brand || "").toLowerCase() === baseBrand;
      const similarPrice =
        candidatePrice > 0 && candidatePrice >= minPrice && candidatePrice <= maxPrice;

      let similarityScore = 0;
      if (sameCategory) similarityScore += 50;
      if (similarPrice) similarityScore += 30;
      if (sameBrand) similarityScore += 20;

      return {
        ...candidate,
        similarityScore,
      };
    })
    .filter((candidate) => candidate.similarityScore > 0)
    .sort((left, right) => {
      if (right.similarityScore !== left.similarityScore) {
        return right.similarityScore - left.similarityScore;
      }

      if ((right.rating || 0) !== (left.rating || 0)) {
        return (right.rating || 0) - (left.rating || 0);
      }

      return (right.popularity || 0) - (left.popularity || 0);
    })
    .slice(0, 10);
}

module.exports = {
  analyzePriceHistory,
  analyzeReviews,
  computeScore,
  enrichProductWithAi,
  generateExplanation,
  getSimilarProducts,
  getVerdict,
  rankProducts,
};
