const DEFAULT_IMAGE = "/no-image.png";
const MAX_REVIEWS = 10;
const MAX_PRICE_HISTORY = 20;
const BRAND_ALIASES = {
  "newbalance": "New Balance",
  "new-balance": "New Balance",
  "baccabucci": "Bacca Bucci",
  "redtape": "Red Tape",
};
const KNOWN_BRANDS = ["nike", "adidas", "puma", "campus", "asian", "skechers", "reebok", "crocs", "sparx", "lancer"];

function normalizeWhitespace(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function capitalize(text = "") {
  const normalized = normalizeWhitespace(text);
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "";
}

function collapseRepeatedBrand(value = "") {
  const normalized = toUniqueKey(value);
  if (!normalized) {
    return "";
  }

  const halfLength = Math.floor(normalized.length / 2);
  if (
    normalized.length % 2 === 0 &&
    normalized.slice(0, halfLength) === normalized.slice(halfLength)
  ) {
    return normalized.slice(0, halfLength);
  }

  return normalized;
}

function formatBrand(name = "", fallback = "Generic") {
  const normalized = normalizeWhitespace(String(name || ""));
  if (!normalized) {
    return fallback;
  }

  return normalized
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function cleanBrand(raw = "", fallback = "Generic") {
  if (!raw) {
    return fallback;
  }

  let normalized = collapseRepeatedBrand(raw).toLowerCase();
  normalized = normalized.replace(/(.)\1{2,}/g, "$1");
  normalized = normalized.replace(/[^a-z]/g, "");

  if (!normalized || /\d/.test(normalized)) {
    return fallback;
  }

  if (normalized.length > 25) {
    normalized = normalized.slice(0, 15);
  }

  return formatBrand(normalized, fallback);
}

function extractBrand(value = "", fallback = "Generic") {
  const normalized = normalizeWhitespace(String(value || ""));
  if (!normalized) {
    return fallback;
  }

  const cleaned = normalized.replace(/[^a-zA-Z\s]/g, " ");
  const words = cleaned
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);

  if (words.length === 0) {
    return fallback;
  }

  return cleanBrand(words[0], fallback);
}

function getBrand(rawTitle = "", rawBrand = "", fallback = "Generic") {
  const title = normalizeWhitespace(String(rawTitle || rawBrand || ""));
  const lowerTitle = title.toLowerCase();

  for (const knownBrand of KNOWN_BRANDS) {
    if (lowerTitle.includes(knownBrand)) {
      return formatBrand(knownBrand, fallback);
    }
  }

  const explicitBrand = cleanBrand(rawBrand, "");
  if (explicitBrand) {
    return explicitBrand;
  }

  return extractBrand(title, fallback);
}

function normalizeBrandName(value = "", fallback = "Generic") {
  const normalized = collapseRepeatedBrand(value);

  if (!normalized) {
    return fallback;
  }

  if (BRAND_ALIASES[normalized]) {
    return BRAND_ALIASES[normalized];
  }

  return cleanBrand(normalized, fallback);
}

function toUniqueKey(value = "") {
  return normalizeWhitespace(String(value || ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function buildAmazonSearchUrl(name = "") {
  const query = normalizeWhitespace(name);
  return query ? `https://www.amazon.in/s?k=${encodeURIComponent(query)}` : "";
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(men|men's|mens|women|women's|womens)\b/g, " ")
    .replace(/\brunning shoes?\b/g, " ")
    .replace(/\broad running\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function deriveModelName(name = "", brand = "") {
  const safeName = normalizeWhitespace(name);
  const safeBrand = normalizeWhitespace(brand);

  if (!safeName) {
    return "Core";
  }

  if (safeBrand && safeName.toLowerCase().startsWith(safeBrand.toLowerCase())) {
    return normalizeWhitespace(safeName.slice(safeBrand.length)) || safeName;
  }

  return safeName;
}

function detectCategory(value) {
  const normalized = normalizeName(value);

  if (/\brun|runner|jog|pegasus|novablast|gel kayano|fuelcell\b/.test(normalized)) {
    return "Running";
  }

  if (/\bcasual|loafer|slip on\b/.test(normalized)) {
    return "Casual";
  }

  if (/\bsneaker|court|retro\b/.test(normalized)) {
    return "Sneakers";
  }

  if (/\bsport|performance|athletic\b/.test(normalized)) {
    return "Sports";
  }

  if (/\btrainer|training|gym|workout|crossfit\b/.test(normalized)) {
    return "Training";
  }

  return "Other";
}

function detectGender(value) {
  const normalized = String(value || "").toLowerCase();

  if (/\bwomen|women's|womens|female|ladies\b/.test(normalized)) {
    return "Women";
  }

  if (/\bmen|men's|mens|male\b/.test(normalized)) {
    return "Men";
  }

  return "Unisex";
}

function tokenizeName(value) {
  return normalizeName(value)
    .split(" ")
    .filter(Boolean);
}

function getNameSimilarity(left, right) {
  const leftTokens = new Set(tokenizeName(left));
  const rightTokens = new Set(tokenizeName(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function areProductsSimilar(leftProduct, rightProduct) {
  const sameBrand =
    String(leftProduct?.brand || "").toLowerCase() ===
    String(rightProduct?.brand || "").toLowerCase();

  if (!sameBrand) {
    return false;
  }

  const leftName = normalizeName(leftProduct?.name);
  const rightName = normalizeName(rightProduct?.name);

  if (!leftName || !rightName) {
    return false;
  }

  if (leftName === rightName) {
    return true;
  }

  return getNameSimilarity(leftName, rightName) >= 0.85;
}

function normalizeTextArray(values = [], limit = 12) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.map((value) => normalizeWhitespace(String(value || ""))).filter(Boolean))].slice(
    0,
    limit
  );
}

function normalizeSizes(values = []) {
  return normalizeTextArray(values, 16).map((value) => value.toUpperCase());
}

function normalizeColors(values = []) {
  return normalizeTextArray(values, 10);
}

function normalizeDescription(value = "", fallbackName = "") {
  const normalized = normalizeWhitespace(value);

  if (normalized) {
    return normalized;
  }

  return fallbackName
    ? `${fallbackName} curated from live marketplace data with AI-ready pricing, ratings, and review signals.`
    : "";
}

function sentenceCase(text = "") {
  const normalized = normalizeWhitespace(text);
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "";
}

function generateReviewHighlights(product = {}, reviews = []) {
  const explicitHighlights = normalizeTextArray(product?.reviewHighlights || [], 6);
  if (explicitHighlights.length > 0) {
    return explicitHighlights;
  }

  const reviewTexts = normalizeTextArray(
    (Array.isArray(reviews) ? reviews : []).map((review) => review?.text || ""),
    6
  );
  if (reviewTexts.length > 0) {
    return reviewTexts;
  }

  const generated = [];
  const description = String(product?.description || product?.story || "").toLowerCase();
  const features = normalizeTextArray(product?.features || [], 8).map((feature) => feature.toLowerCase());

  if (description.includes("breathable") || features.some((feature) => feature.includes("mesh"))) {
    generated.push("Comfortable and breathable for longer wear");
  }

  if (description.includes("cushion") || features.some((feature) => feature.includes("cushion"))) {
    generated.push("Supportive cushioning for everyday comfort");
  }

  if (description.includes("running") || String(product?.category || "").toLowerCase() === "running") {
    generated.push("Good for running and daily training");
  }

  if (description.includes("light") || features.some((feature) => feature.includes("light"))) {
    generated.push("Lightweight feel for easier movement");
  }

  if (generated.length === 0) {
    generated.push("Well-balanced option for regular daily wear");
  }

  return generated.slice(0, 6).map((item) => sentenceCase(item));
}

function parseDiscountPercentage(value = 0, currentPrice = 0, originalPrice = 0) {
  const explicit = Number(value);
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  const current = Number(currentPrice);
  const original = Number(originalPrice);

  if (Number.isFinite(current) && Number.isFinite(original) && original > current && original > 0) {
    return Number((((original - current) / original) * 100).toFixed(2));
  }

  return 0;
}

function toValidPriceEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const price = Number(entry.price);
  if (!Number.isFinite(price) || price < 0) {
    return null;
  }

  return {
    source:
      String(entry.source || entry.store || "Unknown").trim() || "Unknown",
    platform:
      String(entry.platform || entry.source || entry.store || "Unknown").trim() || "Unknown",
    price,
    link: String(entry.link || entry.url || "").trim(),
  };
}

function mergePrices(prices = []) {
  const merged = new Map();

  for (const entry of prices) {
    const normalized = toValidPriceEntry(entry);
    if (!normalized) {
      continue;
    }

    const key = normalized.source.toLowerCase();
    const existing = merged.get(key);

    if (!existing || normalized.price < existing.price) {
      merged.set(key, normalized);
    } else if (!existing.link && normalized.link) {
      existing.link = normalized.link;
    }
  }

  return Array.from(merged.values()).sort((left, right) => left.price - right.price);
}

function buildMarketplaceOffers(product, prices = []) {
  const source = String(product?.source || product?.platform || "Marketplace").trim() || "Marketplace";
  const currentPrice = Number(product?.currentPrice ?? product?.bestPrice ?? product?.price) || 0;
  const originalPrice = Number(product?.originalPrice) || currentPrice;
  const rating = Number(product?.rating) || 0;
  const topReviews = normalizeReviews(product?.topReviews || product?.reviews, rating);
  const totalReviews = Number(product?.totalReviews) || topReviews.length;
  const image = String(product?.image || "").trim();

  const explicitMarketplaces = Array.isArray(product?.marketplaces) ? product.marketplaces : [];
  if (explicitMarketplaces.length > 0) {
    return explicitMarketplaces
      .map((entry) => {
        const price = Number(entry?.currentPrice ?? entry?.price ?? currentPrice);
        if (!Number.isFinite(price) || price <= 0) {
          return null;
        }

        const offerSource =
          String(entry?.marketplace || entry?.platform || entry?.source || source).trim() || source;
        const offerUrl = String(
          entry?.productUrl || entry?.buyLink || entry?.link || product?.productUrl || product?.buyLink || ""
        ).trim();

        return {
          marketplace: offerSource,
          source: offerSource,
          platform: offerSource,
          currentPrice: price,
          originalPrice: Number(entry?.originalPrice) || price,
          discountPercentage: parseDiscountPercentage(
            entry?.discountPercentage,
            price,
            Number(entry?.originalPrice) || price
          ),
          availability: String(entry?.availability || product?.availability || "Unknown").trim() || "Unknown",
          productUrl: offerUrl,
          buyLink: offerUrl,
          image: String(entry?.image || image).trim(),
          rating: Number(entry?.rating ?? rating) || 0,
          totalReviews: Number(entry?.totalReviews) || totalReviews,
          topReviews: normalizeReviews(entry?.topReviews || topReviews, rating),
          scrapedAt: entry?.scrapedAt ? new Date(entry.scrapedAt) : new Date(),
        };
      })
      .filter(Boolean);
  }

  if (prices.length === 0 && currentPrice <= 0) {
    return [];
  }

  const baseEntries = prices.length > 0 ? prices : [{ source, platform: source, price: currentPrice, link: product?.productUrl || product?.buyLink || "" }];
  return baseEntries
    .map((entry) => {
      const price = Number(entry?.price ?? currentPrice);
      if (!Number.isFinite(price) || price <= 0) {
        return null;
      }

      const offerSource =
        String(entry?.platform || entry?.source || entry?.store || source).trim() || source;
      const offerUrl = String(
        entry?.link || entry?.buyLink || product?.productUrl || product?.buyLink || ""
      ).trim();

      return {
        marketplace: offerSource,
        source: offerSource,
        platform: offerSource,
        currentPrice: price,
        originalPrice: Number(product?.originalPrice) || price,
        discountPercentage: parseDiscountPercentage(product?.discountPercentage, price, Number(product?.originalPrice) || price),
        availability: String(product?.availability || "Unknown").trim() || "Unknown",
        productUrl: offerUrl,
        buyLink: offerUrl,
        image,
        rating,
        totalReviews,
        topReviews,
        scrapedAt: new Date(),
      };
    })
    .filter(Boolean);
}

function ensurePrices(product) {
  const explicitMarketplacePrices = Array.isArray(product?.marketplacePrices)
    ? product.marketplacePrices
    : [];
  const mergedMarketplacePrices = mergePrices(explicitMarketplacePrices);

  if (mergedMarketplacePrices.length > 0) {
    return mergedMarketplacePrices;
  }

  const explicitPrices = Array.isArray(product?.prices) ? product.prices : [];
  const mergedExplicit = mergePrices(explicitPrices);

  if (mergedExplicit.length > 0) {
    return mergedExplicit;
  }

  const fallbackPrice = Number(product?.bestPrice ?? product?.price);
  if (Number.isFinite(fallbackPrice) && fallbackPrice >= 0) {
    return [
      {
        source: String(product?.source || "Unknown").trim() || "Unknown",
        platform: String(product?.platform || product?.source || "Unknown").trim() || "Unknown",
        price: fallbackPrice,
        link: String(product?.link || product?.url || "").trim(),
      },
    ];
  }

  return [];
}

function getBestPrice(prices = [], fallbackValue = 0) {
  if (prices.length > 0) {
    return Math.min(...prices.map((entry) => entry.price));
  }

  const fallback = Number(fallbackValue);
  return Number.isFinite(fallback) && fallback >= 0 ? fallback : 0;
}

function normalizeReviews(reviews = [], fallbackRating = 0) {
  if (!Array.isArray(reviews)) {
    return [];
  }

  return reviews
    .map((review) => {
      const text = String(review?.text || "").trim();
      const rating = Number(review?.rating ?? fallbackRating) || 0;

      if (!text) {
        return null;
      }

      return {
        text,
        rating: Math.min(5, Math.max(0, rating)),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_REVIEWS);
}

function normalizePriceHistory(history = [], fallbackPrice = 0) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((entry) => {
      const price = Number(entry?.price ?? fallbackPrice);
      const date = entry?.date ? new Date(entry.date) : new Date();

      if (!Number.isFinite(price) || price <= 0 || Number.isNaN(date.getTime())) {
        return null;
      }

      return {
        price,
        date,
      };
    })
    .filter(Boolean)
    .slice(-MAX_PRICE_HISTORY);
}

function normalizeImages(images = [], fallbackImage = DEFAULT_IMAGE) {
  const safeImages = Array.isArray(images)
    ? images
        .map((image) => String(image || "").trim())
        .filter(Boolean)
    : [];

  if (safeImages.length > 0) {
    return [...new Set(safeImages)].slice(0, 8);
  }

  return [String(fallbackImage || DEFAULT_IMAGE).trim() || DEFAULT_IMAGE];
}

function normalizeProductShape(product) {
  const inferredCategory = detectCategory(
    `${product?.category || ""} ${product?.name || ""}`
  );
  const inferredGender = detectGender(
    `${product?.gender || ""} ${product?.name || ""} ${product?.url || ""}`
  );
  const brandName =
    product?.uniqueKey
      ? normalizeBrandName(String(product.uniqueKey).split(/[_\s-]+/)[0], "Generic")
      : getBrand(product?.name || product?.fullTitle, product?.brand, "Generic");
  const fullTitle = String(product?.fullTitle || product?.name || "").trim() || "Unknown Shoe";
  const modelName = deriveModelName(product?.modelName || fullTitle, brandName);
  const safeProduct = {
    ...product,
    name: String(product?.name || fullTitle).trim() || "Unknown Shoe",
    brand: brandName,
    brandName,
    modelName,
    fullTitle,
    description: normalizeDescription(product?.description || product?.story, fullTitle),
    uniqueKey:
      String(product?.uniqueKey || "").trim() ||
      toUniqueKey(`${brandName} ${modelName}`) ||
      toUniqueKey(product?.brand) ||
      toUniqueKey(product?.name) ||
      "generic",
    price: Number(product?.price) || 999,
    image: String(product?.image || "").trim() || DEFAULT_IMAGE,
    category: String(product?.category || "").trim() || inferredCategory,
    gender: String(product?.gender || "").trim() || inferredGender,
    rating: Number((Number(product?.rating) || 4).toFixed(2)),
    popularity:
      Number(product?.popularity) || Math.floor(Math.random() * 30) + 70,
    source: String(product?.source || "").trim() || "Unknown",
    platform: String(product?.platform || product?.source || "").trim() || "Unknown",
    link: String(product?.link || product?.url || "").trim(),
    buyLink: String(product?.buyLink || product?.link || product?.url || "").trim(),
    productUrl: String(
      product?.productUrl || product?.buyLink || product?.link || product?.url || ""
    ).trim(),
    availability: String(product?.availability || "Unknown").trim() || "Unknown",
    clicks: Number(product?.clicks) || 0,
    originalPrice: Number(product?.originalPrice) || 0,
    discountPercentage: Number(product?.discountPercentage) || 0,
    totalReviews: Number(product?.totalReviews) || 0,
    material: normalizeWhitespace(product?.material || ""),
    soleType: normalizeWhitespace(product?.soleType || ""),
    features: normalizeTextArray(product?.features, 10),
    colorsAvailable: normalizeColors(product?.colorsAvailable || product?.colors || []),
    sizesAvailable: normalizeSizes(product?.sizesAvailable || []),
  };
  const fallbackAmazonLink =
    String(safeProduct?.source || safeProduct?.platform || "").toLowerCase() === "amazon" &&
    !safeProduct.buyLink
      ? buildAmazonSearchUrl(safeProduct.name)
      : "";
  const prices = ensurePrices(safeProduct);
  const marketplaces = buildMarketplaceOffers(safeProduct, prices);
  const bestPrice = getBestPrice(prices, safeProduct?.bestPrice ?? safeProduct?.price);
  const reviews = normalizeReviews(product?.reviews, safeProduct.rating);
  const reviewHighlights = generateReviewHighlights(safeProduct, reviews);
  const fallbackReviews =
    reviews.length > 0
      ? reviews
      : reviewHighlights.map((text) => ({
          text,
          rating: safeProduct.rating || 4,
        }));
  const priceHistory = normalizePriceHistory(
    product?.priceHistory,
    bestPrice || safeProduct.price
  );
  const images = normalizeImages(product?.images, safeProduct.image);
  const topReviews = normalizeReviews(product?.topReviews || fallbackReviews, safeProduct.rating);
  const totalReviews = Number(product?.totalReviews) || fallbackReviews.length || topReviews.length;

  return {
    ...safeProduct,
    normalizedName: normalizeName(safeProduct?.name),
    category: safeProduct?.category || inferredCategory,
    gender: safeProduct?.gender || inferredGender,
    prices,
    marketplaces,
    marketplacePrices: prices.map((entry) => ({
      source: entry.source,
      platform: entry.platform,
      price: entry.price,
      buyLink: entry.link,
      link: entry.link,
    })),
    reviews: fallbackReviews,
    topReviews,
    reviewHighlights,
    totalReviews,
    images,
    buyLink: safeProduct.buyLink || fallbackAmazonLink,
    productUrl: safeProduct.productUrl || safeProduct.buyLink || fallbackAmazonLink,
    availability: safeProduct.availability,
    bestPrice,
    price: bestPrice,
    priceHistory,
    retailers: prices.length,
    clicks: safeProduct.clicks,
    lastUpdated: product?.lastUpdated || new Date(),
    currentPrice: bestPrice,
    originalPrice:
      Number(safeProduct.originalPrice) ||
      Math.max(...marketplaces.map((entry) => Number(entry.originalPrice) || bestPrice), bestPrice),
    discountPercentage:
      Number(safeProduct.discountPercentage) ||
      parseDiscountPercentage(
        product?.discountPercentage,
        bestPrice,
        Number(safeProduct.originalPrice) ||
          Math.max(...marketplaces.map((entry) => Number(entry.originalPrice) || bestPrice), bestPrice)
      ),
    colors: normalizeColors(product?.colors || product?.colorsAvailable || []),
    colorsAvailable: normalizeColors(product?.colorsAvailable || product?.colors || []),
    sizesAvailable: normalizeSizes(product?.sizesAvailable || []),
  };
}

function normalizeProducts(products = []) {
  const safeProducts = Array.isArray(products) ? products : [];
  console.log("Before normalization:", safeProducts.length);
  const normalized = safeProducts.map((product) => normalizeProductShape(product));
  console.log("After normalization:", normalized.length);
  return normalized;
}

function mergeProducts(products) {
  if (!products || products.length === 0) {
    return null;
  }

  const normalized = products.map((product) => normalizeProductShape(product));
  const merged = normalized.reduce((current, product) => {
    if (!current) {
      return {
        ...product,
        prices: [...product.prices],
      };
    }

    current.prices = mergePrices([...current.prices, ...product.prices]);
    current.bestPrice = getBestPrice(current.prices, current.bestPrice);
    current.price = current.bestPrice;
    current.retailers = current.prices.length;
    current.image = current.image || product.image;
    current.category = current.category || product.category;
    current.rating = Math.max(current.rating || 0, product.rating || 0);
    current.popularity = Math.max(current.popularity || 0, product.popularity || 0);
    current.lastUpdated =
      new Date(product.lastUpdated || 0) > new Date(current.lastUpdated || 0)
        ? product.lastUpdated
        : current.lastUpdated;

    return current;
  }, null);

  return normalizeProductShape(merged);
}

module.exports = {
  areProductsSimilar,
  buildAmazonSearchUrl,
  detectCategory,
  detectGender,
  ensurePrices,
  getBestPrice,
  getNameSimilarity,
  mergePrices,
  mergeProducts,
  normalizePriceHistory,
  normalizeReviews,
  normalizeName,
  normalizeImages,
  normalizeProducts,
  normalizeProductShape,
  normalizeBrandName,
  tokenizeName,
  toUniqueKey,
};
