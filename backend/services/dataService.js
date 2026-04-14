const mongoose = require("mongoose");
const Shoe = require("../models/Shoe");
const { clearCache, getCache, setCache } = require("./cacheService");
const {
  normalizeBrandName,
  normalizeProductShape,
  toUniqueKey,
} = require("./productNormalizationService");
const { enrichProductWithAi } = require("./aiRecommendationService");
const { buildHybridRecommendations } = require("./mlRecommendationService");
const { getPriceTrendForProduct } = require("./priceHistoryService");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildProductQuery(options = {}) {
  const query = {};

  const rawBrands = Array.isArray(options.brands)
    ? options.brands
    : options.brand
      ? [options.brand]
      : [];
  const brands = rawBrands
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

  if (brands.length === 1) {
    const brand = brands[0];
    query.$or = [
      { brand: new RegExp(`^${escapeRegex(brand)}$`, "i") },
      { uniqueKey: new RegExp(`^${escapeRegex(brand)}$`, "i") },
    ];
  }

  if (brands.length > 1) {
    const brandQueries = brands.flatMap((brand) => [
      { brand: new RegExp(`^${escapeRegex(brand)}$`, "i") },
      { uniqueKey: new RegExp(`^${escapeRegex(brand)}$`, "i") },
    ]);
    query.$or = brandQueries;
  }

  if (options.category) {
    query.category = new RegExp(`^${escapeRegex(String(options.category).trim())}$`, "i");
  }

  if (options.gender) {
    query.gender = new RegExp(`^${escapeRegex(String(options.gender).trim())}$`, "i");
  }

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    query.bestPrice = {};

    if (options.minPrice !== undefined && Number.isFinite(Number(options.minPrice))) {
      query.bestPrice.$gte = Number(options.minPrice);
    }

    if (options.maxPrice !== undefined && Number.isFinite(Number(options.maxPrice))) {
      query.bestPrice.$lte = Number(options.maxPrice);
    }

    if (Object.keys(query.bestPrice).length === 0) {
      delete query.bestPrice;
    }
  }

  if (options.rating !== undefined && Number.isFinite(Number(options.rating))) {
    query.rating = { $gte: Number(options.rating) };
  }

  if (options.search) {
    const searchRegex = new RegExp(escapeRegex(String(options.search).trim()), "i");
    const searchQuery = {
      $or: [
        { name: searchRegex },
        { brand: searchRegex },
        { uniqueKey: searchRegex },
        { category: searchRegex },
      ],
    };

    if (query.$and) {
      query.$and.push(searchQuery);
    } else if (query.$or) {
      const brandQuery = { $or: query.$or };
      delete query.$or;
      query.$and = [brandQuery, searchQuery];
    } else {
      Object.assign(query, searchQuery);
    }
  }

  return query;
}

function buildSortQuery(sort = "") {
  switch (String(sort || "").trim()) {
    case "priceLow":
      return { bestPrice: 1, rating: -1 };
    case "priceHigh":
      return { bestPrice: -1, rating: -1 };
    case "rating":
      return { rating: -1, popularity: -1 };
    case "popularity":
      return { popularity: -1, rating: -1 };
    case "discount":
      return { discountPercentage: -1, bestPrice: 1, rating: -1 };
    case "ai":
      return { aiScore: -1, popularity: -1, rating: -1 };
    default:
      return { popularity: -1, rating: -1, id: 1 };
  }
}

function withAiScore(product) {
  return enrichProductWithAi(product, {});
}

async function attachHybridScores(products = [], user = {}) {
  const safeProducts = (Array.isArray(products) ? products : []).filter(Boolean);
  if (safeProducts.length === 0) {
    return [];
  }

  const hybridProducts = await buildHybridRecommendations(safeProducts, user);
  const hybridMap = new Map(
    hybridProducts.map((product) => [
      String(product?._id || product?.id || product?.uniqueKey),
      enrichProductWithAi(product, user),
    ])
  );

  return safeProducts.map((product) => {
    const key = String(product?._id || product?.id || product?.uniqueKey);
    return hybridMap.get(key) || withAiScore(product);
  });
}

function buildFilterMetadata(products = []) {
  const safeProducts = Array.isArray(products) ? products : [];
  const priceValues = safeProducts
    .map((product) => Number(product?.bestPrice ?? product?.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  const brands = [...new Set(
    safeProducts
      .map((product) => normalizeBrandName(product?.brand || product?.uniqueKey || "", ""))
      .filter((brand) => {
        const normalized = toUniqueKey(brand);
        return normalized && normalized.length > 1 && normalized !== "generic" && normalized !== "unknown";
      })
  )].sort((left, right) => left.localeCompare(right));

  return {
    brands,
    categories: [...new Set(safeProducts.map((product) => product?.category).filter(Boolean))].sort(),
    genders: [...new Set(safeProducts.map((product) => product?.gender).filter(Boolean))].sort(),
    maxPrice: priceValues.length > 0 ? Math.max(...priceValues) : 0,
  };
}

function safeNormalizeProduct(product) {
  try {
    return normalizeProductShape(product);
  } catch (error) {
    console.error("Normalization error:", error.message);
    return null;
  }
}

async function getAllShoes(options = {}) {
  const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
  const limit = Math.min(1000, Math.max(1, Number.parseInt(options.limit, 10) || 15));
  const skip = (page - 1) * limit;
  const query = buildProductQuery(options);
  const sortQuery = buildSortQuery(options.sort);
  const cacheKey = `products:${JSON.stringify({ ...options, page, limit, skip, sortQuery })}`;
  const cached = getCache(cacheKey);

  if (cached) {
    return cached;
  }

  const total = await Shoe.countDocuments(query);
  let products = [];

  if (options.sort === "ai") {
    const aiCandidates = await Shoe.find(query)
      .sort({ popularity: -1, rating: -1, bestPrice: 1 })
      .limit(Math.min(300, Math.max(limit * 6, 100)))
      .lean();

    products = (
      await buildHybridRecommendations(
        aiCandidates.map((shoe) => safeNormalizeProduct(shoe)).filter(Boolean),
        {
          preferredBrands: Array.isArray(options.brands) ? options.brands : options.brand ? [options.brand] : [],
          category: options.category,
          maxPrice: options.maxPrice,
          budget: options.maxPrice,
        }
      )
    ).slice(skip, skip + limit).map((product) =>
      enrichProductWithAi(product, {
        preferredBrands: Array.isArray(options.brands) ? options.brands : options.brand ? [options.brand] : [],
        category: options.category,
        maxPrice: options.maxPrice,
        budget: options.maxPrice,
      })
    );
  } else {
    const shoes = await Shoe.find(query).sort(sortQuery).skip(skip).limit(limit).lean();
    products = await attachHybridScores(
      shoes.map((shoe) => safeNormalizeProduct(shoe)).filter(Boolean),
      {
        preferredBrands: Array.isArray(options.brands) ? options.brands : options.brand ? [options.brand] : [],
        category: options.category,
        maxPrice: options.maxPrice,
        budget: options.maxPrice,
      }
    );
  }

  const payload = {
    products,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    filters: buildFilterMetadata(products),
  };

  return setCache(cacheKey, payload);
}

async function filterShoes(options = {}) {
  const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(options.limit, 10) || 15));
  const skip = (page - 1) * limit;
  const query = buildProductQuery(options);
  const cacheKey = `filter:${JSON.stringify({ ...options, page, limit, skip })}`;
  const cached = getCache(cacheKey);

  if (cached) {
    return cached;
  }

  const total = await Shoe.countDocuments(query);
  const metadataCandidates = await Shoe.find({}).lean();
  const metadata = buildFilterMetadata(
    metadataCandidates.map((shoe) => safeNormalizeProduct(shoe)).filter(Boolean)
  );

  let products = [];

  if (options.sort === "ai" || options.sort === "recommended") {
    const aiCandidates = await Shoe.find(query)
      .sort({ popularity: -1, rating: -1, bestPrice: 1 })
      .limit(Math.min(400, Math.max(limit * 8, 120)))
      .lean();

    products = (
      await buildHybridRecommendations(
        aiCandidates.map((shoe) => safeNormalizeProduct(shoe)).filter(Boolean),
        {
          preferredBrands: Array.isArray(options.brands) ? options.brands : [],
          category: options.category,
          maxPrice: options.maxPrice,
          budget: options.maxPrice,
        }
      )
    ).slice(skip, skip + limit).map((product) =>
      enrichProductWithAi(product, {
        preferredBrands: Array.isArray(options.brands) ? options.brands : [],
        category: options.category,
        maxPrice: options.maxPrice,
        budget: options.maxPrice,
      })
    );
  } else {
    const sortQuery = buildSortQuery(options.sort);
    const shoes = await Shoe.find(query).sort(sortQuery).skip(skip).limit(limit).lean();
    products = await attachHybridScores(
      shoes.map((shoe) => safeNormalizeProduct(shoe)).filter(Boolean),
      {
        preferredBrands: Array.isArray(options.brands) ? options.brands : [],
        category: options.category,
        maxPrice: options.maxPrice,
        budget: options.maxPrice,
      }
    );
  }

  return setCache(cacheKey, {
    products,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    filters: metadata,
  });
}

async function getShoeById(id) {
  const shoe = mongoose.Types.ObjectId.isValid(String(id))
    ? await Shoe.findById(id).lean()
    : Number.isNaN(Number(id))
      ? null
      : await Shoe.findOne({ id: Number(id) }).lean();
  const normalized = shoe ? safeNormalizeProduct(shoe) : null;
  if (!normalized) {
    return null;
  }

  const [hybridProduct] = await attachHybridScores([normalized], {
    budget: Number(normalized?.bestPrice ?? normalized?.price) || 5000,
    category: normalized?.category,
    preferredBrands: normalized?.brand ? [normalized.brand] : [],
  });

  return hybridProduct || withAiScore(normalized);
}

async function createShoe(data) {
  const shoe = await Shoe.create(data);
  clearCache("products:");
  clearCache("search:");
  clearCache("ai:");
  return shoe.toObject();
}

async function getAiCandidateShoes(options = {}) {
  const limit = Math.min(100, Math.max(1, Number.parseInt(options.limit, 10) || 100));
  const query = buildProductQuery(options);
  const cacheKey = `ai:${JSON.stringify({ ...options, limit })}`;
  const cached = getCache(cacheKey);

  if (cached) {
    return cached;
  }

  const shoes = await Shoe.find(query)
    .sort({ popularity: -1, rating: -1, bestPrice: 1 })
    .limit(limit)
    .lean();

  return setCache(
    cacheKey,
    await attachHybridScores(
      shoes
        .map((shoe) => safeNormalizeProduct(shoe))
        .filter(Boolean),
      {
        preferredBrands: Array.isArray(options.brands) ? options.brands : options.brand ? [options.brand] : [],
        category: options.category,
        maxPrice: options.maxPrice,
        budget: options.maxPrice,
      }
    )
  );
}

async function searchShoes(searchQuery, options = {}) {
  const queryText = String(searchQuery || "").trim();
  if (!queryText) {
    return [];
  }

  const regex = new RegExp(escapeRegex(queryText), "i");
  const limit = Math.min(100, Math.max(1, Number.parseInt(options.limit, 10) || 30));
  const cacheKey = `search:${JSON.stringify({ queryText, limit })}`;
  const cached = getCache(cacheKey);

  if (cached) {
    return cached;
  }

  const shoes = await Shoe.find({
    $or: [
      { name: { $regex: regex } },
      { brand: { $regex: regex } },
    ],
  })
    .sort({ popularity: -1, rating: -1, id: 1 })
    .limit(limit)
    .lean();

  return setCache(
    cacheKey,
    await attachHybridScores(
      shoes
        .map((shoe) => safeNormalizeProduct(shoe))
        .filter(Boolean),
      {}
    )
  );
}

async function getPriceTrend(id) {
  const shoe = await getShoeById(id);

  if (!shoe) {
    return [];
  }

  const history = await getPriceTrendForProduct(shoe._id || shoe.id);

  if (Array.isArray(history) && history.length > 0) {
    return history
      .map((entry) => ({
        date: entry?.timestamp
          ? new Date(entry.timestamp).toISOString()
          : new Date().toISOString(),
        price: Number(entry?.price) || 0,
        marketplace: entry?.marketplace || "Unknown",
      }))
      .filter((entry) => entry.price > 0);
  }

  return (Array.isArray(shoe.priceHistory) ? shoe.priceHistory : [])
    .map((entry) => ({
      date: entry?.date ? new Date(entry.date).toISOString() : new Date().toISOString(),
      price: Number(entry?.price) || 0,
      marketplace: "BestPrice",
    }))
    .filter((entry) => entry.price > 0);
}

async function getShoesByIds(ids = []) {
  const safeIds = (Array.isArray(ids) ? ids : [])
    .map((id) => String(id || "").trim())
    .filter(Boolean);

  if (safeIds.length === 0) {
    return [];
  }

  const objectIds = safeIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const numericIds = safeIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  const clauses = [];
  if (objectIds.length > 0) {
    clauses.push({ _id: { $in: objectIds } });
  }
  if (numericIds.length > 0) {
    clauses.push({ id: { $in: numericIds } });
  }
  if (clauses.length === 0) {
    return [];
  }

  const shoes = await Shoe.find({ $or: clauses }).lean();
  return attachHybridScores(
    shoes.map((shoe) => safeNormalizeProduct(shoe)).filter(Boolean),
    {}
  );
}

module.exports = {
  filterShoes,
  getAllShoes,
  getAiCandidateShoes,
  getPriceTrend,
  getShoeById,
  getShoesByIds,
  searchShoes,
  createShoe,
};
