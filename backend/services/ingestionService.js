const Shoe = require("../models/Shoe");
const { runScrapers } = require("./aggregatorService");
const { clearCache } = require("./cacheService");
const {
  areProductsSimilar,
  mergePrices,
  normalizeProducts,
  normalizeProductShape,
  normalizeName,
  normalizeReviews,
} = require("./productNormalizationService");
const { recordPriceHistory } = require("./priceHistoryService");
const { maybeTrainMlModel } = require("./mlRecommendationService");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildUniqueKey(product) {
  const brand = normalizeName(product?.brandName || product?.brand);
  const model = normalizeName(product?.modelName || product?.name);

  return `${brand}${model}`
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function getNextId() {
  const latest = await Shoe.findOne().sort({ id: -1 }).lean();
  return latest ? latest.id + 1 : 1;
}

function createCounters() {
  return {
    nextId: 1,
    added: 0,
    updated: 0,
    failed: 0,
  };
}

function prepareProductForSave(product) {
  const normalized = normalizeProductShape(product);
  const prices =
    Array.isArray(normalized.prices) && normalized.prices.length > 0
      ? mergePrices(normalized.prices)
      : [
          {
            source: normalized.source || "unknown",
            price: normalized.price,
            link: normalized.link || normalized.url || "",
          },
        ];
  const validPrices = prices.filter((entry) => Number(entry?.price) > 0);

  const bestPrice = Math.min(...validPrices.map((entry) => entry.price));

  return {
    ...normalized,
    uniqueKey: buildUniqueKey(normalized),
    prices: validPrices,
    reviews: Array.isArray(normalized.reviews) ? normalized.reviews.slice(0, 10) : [],
    topReviews: Array.isArray(normalized.topReviews)
      ? normalized.topReviews.slice(0, 10)
      : Array.isArray(normalized.reviews)
        ? normalized.reviews.slice(0, 10)
        : [],
    reviewHighlights: Array.isArray(normalized.reviewHighlights)
      ? normalized.reviewHighlights.slice(0, 6)
      : [],
    buyLink: normalized.buyLink || normalized.link || normalized.url || "",
    productUrl:
      normalized.productUrl || normalized.buyLink || normalized.link || normalized.url || "",
    availability: normalized.availability || "Unknown",
    images: Array.isArray(normalized.images) ? normalized.images.slice(0, 8) : [normalized.image],
    bestPrice,
    price: bestPrice,
    priceHistory: Array.isArray(normalized.priceHistory) ? normalized.priceHistory.slice(-20) : [],
    marketplaces: Array.isArray(normalized.marketplaces) ? normalized.marketplaces : [],
    retailers: validPrices.length,
    clicks: Number(normalized.clicks) || 0,
    lastUpdated: new Date(),
  };
}

async function findExistingProduct(prepared) {
  const byUniqueKey = await Shoe.findOne({
    uniqueKey: prepared.uniqueKey,
  });

  if (byUniqueKey) {
    return byUniqueKey;
  }

  const byBrandAndModel = await Shoe.findOne({
    brandName: new RegExp(`^${escapeRegex(prepared.brandName || prepared.brand)}$`, "i"),
    modelName: new RegExp(`^${escapeRegex(prepared.modelName || prepared.name)}$`, "i"),
  });

  if (byBrandAndModel) {
    return byBrandAndModel;
  }

  const candidateMatches = await Shoe.find({
    brandName: new RegExp(`^${escapeRegex(prepared.brandName || prepared.brand)}$`, "i"),
  }).limit(20);

  return (
    candidateMatches.find((candidate) => areProductsSimilar(candidate.toObject(), prepared)) || null
  );
}

function mergeMarketplaceOffers(existingOffers = [], incomingOffers = []) {
  const merged = new Map();

  [...existingOffers, ...incomingOffers].forEach((offer) => {
    const marketplace = String(
      offer?.marketplace || offer?.platform || offer?.source || "Marketplace"
    ).trim() || "Marketplace";
    const price = Number(offer?.currentPrice ?? offer?.price);

    if (!Number.isFinite(price) || price <= 0) {
      return;
    }

    const normalizedOffer = {
      marketplace,
      source: marketplace,
      platform: marketplace,
      currentPrice: price,
      originalPrice: Number(offer?.originalPrice) || price,
      discountPercentage: Number(offer?.discountPercentage) || 0,
      availability: String(offer?.availability || "Unknown").trim() || "Unknown",
      productUrl: String(offer?.productUrl || offer?.buyLink || offer?.link || "").trim(),
      buyLink: String(offer?.buyLink || offer?.productUrl || offer?.link || "").trim(),
      image: String(offer?.image || "").trim(),
      rating: Number(offer?.rating) || 0,
      totalReviews: Number(offer?.totalReviews) || 0,
      topReviews: normalizeReviews(offer?.topReviews, Number(offer?.rating) || 0),
      scrapedAt: offer?.scrapedAt ? new Date(offer.scrapedAt) : new Date(),
    };

    const existing = merged.get(marketplace.toLowerCase());
    if (!existing || normalizedOffer.currentPrice <= existing.currentPrice) {
      merged.set(marketplace.toLowerCase(), normalizedOffer);
    } else {
      merged.set(marketplace.toLowerCase(), {
        ...existing,
        originalPrice: Math.max(existing.originalPrice || 0, normalizedOffer.originalPrice || 0),
        discountPercentage: Math.max(existing.discountPercentage || 0, normalizedOffer.discountPercentage || 0),
        availability: existing.availability || normalizedOffer.availability,
        productUrl: existing.productUrl || normalizedOffer.productUrl,
        buyLink: existing.buyLink || normalizedOffer.buyLink,
        image: existing.image || normalizedOffer.image,
        rating: Math.max(existing.rating || 0, normalizedOffer.rating || 0),
        totalReviews: Math.max(existing.totalReviews || 0, normalizedOffer.totalReviews || 0),
        topReviews:
          Array.isArray(existing.topReviews) && existing.topReviews.length > 0
            ? existing.topReviews
            : normalizedOffer.topReviews,
      });
    }
  });

  return Array.from(merged.values()).sort((left, right) => left.currentPrice - right.currentPrice);
}

async function ingestProducts(products) {
  const counters = createCounters();
  counters.nextId = await getNextId();
  const receivedProducts = Array.isArray(products) ? products : [];
  console.log(`INGESTION RECEIVED: ${receivedProducts.length}`);
  const normalizedProducts = normalizeProducts(receivedProducts);
  const batchSize = 20;

  async function saveProduct(product) {
    try {
      const prepared = prepareProductForSave(product);
      if (
        !prepared ||
        !prepared.brand ||
        !prepared.modelName ||
        !prepared.category ||
        !prepared.image ||
        !Number.isFinite(Number(prepared.bestPrice)) ||
        Number(prepared.bestPrice) <= 0
      ) {
        counters.failed += 1;
        return;
      }

      console.log(`Saving: ${prepared.name}`);
      const existing = await findExistingProduct(prepared);

      const incomingOffer =
        prepared.prices.find((entry) => Number(entry?.price) > 0) || null;

      if (!incomingOffer) {
        counters.failed += 1;
        return;
      }

      if (existing) {
        const existingPrices = Array.isArray(existing.prices) ? existing.prices : [];
        const alreadyExists = existingPrices.some(
          (entry) =>
            String(entry?.source || entry?.store || "").toLowerCase() ===
            String(incomingOffer.source || "").toLowerCase()
        );

        if (!alreadyExists) {
          existing.prices.push({
            source: incomingOffer.source,
            platform: incomingOffer.platform || incomingOffer.source,
            price: incomingOffer.price,
            link: incomingOffer.link || "",
          });
        } else {
          existing.prices = existingPrices.map((entry) => {
            const currentSource = String(
              entry?.source || entry?.store || ""
            ).toLowerCase();

            if (currentSource !== String(incomingOffer.source || "").toLowerCase()) {
              return entry;
            }

            return {
              source: incomingOffer.source,
              platform: incomingOffer.platform || incomingOffer.source,
              price: Math.min(Number(entry?.price) || Infinity, incomingOffer.price),
              link: incomingOffer.link || entry?.link || entry?.url || "",
            };
          });
        }

        existing.prices = mergePrices(existing.prices).filter(
          (entry) => Number(entry?.price) > 0
        );

        if (existing.prices.length === 0) {
          counters.failed += 1;
          return;
        }

        existing.bestPrice = Math.min(...existing.prices.map((entry) => entry.price));
        existing.price = existing.bestPrice;
        existing.retailers = existing.prices.length;
        existing.brand = existing.brand || prepared.brand;
        existing.brandName = existing.brandName || prepared.brandName || prepared.brand;
        existing.modelName = existing.modelName || prepared.modelName || prepared.name;
        existing.fullTitle = prepared.fullTitle || existing.fullTitle || prepared.name;
        existing.description = prepared.description || existing.description || "";
        existing.image = existing.image || prepared.image;
        existing.images = Array.isArray(prepared.images) && prepared.images.length > 0
          ? [...new Set([...(existing.images || []), ...prepared.images])].slice(0, 8)
          : existing.images || [existing.image || prepared.image];
        existing.category = prepared.category || existing.category;
        existing.gender = prepared.gender || existing.gender;
        existing.buyLink = prepared.buyLink || existing.buyLink || incomingOffer.link || "";
        existing.productUrl =
          prepared.productUrl || prepared.buyLink || existing.productUrl || existing.buyLink || "";
        existing.availability = prepared.availability || existing.availability || "Unknown";
        existing.reviews = Array.isArray(prepared.reviews) && prepared.reviews.length > 0
          ? prepared.reviews.slice(0, 10)
          : existing.reviews || [];
        existing.topReviews = Array.isArray(prepared.topReviews) && prepared.topReviews.length > 0
          ? prepared.topReviews.slice(0, 10)
          : existing.topReviews || [];
        existing.reviewHighlights =
          Array.isArray(prepared.reviewHighlights) && prepared.reviewHighlights.length > 0
            ? prepared.reviewHighlights.slice(0, 6)
            : existing.reviewHighlights || [];
        existing.totalReviews = Math.max(Number(existing.totalReviews) || 0, Number(prepared.totalReviews) || 0);
        existing.rating = Math.max(Number(existing.rating) || 0, prepared.rating || 0);
        existing.popularity = Math.max(
          Number(existing.popularity) || 0,
          prepared.popularity || 0
        );
        existing.marketplaces = mergeMarketplaceOffers(existing.marketplaces || [], prepared.marketplaces || prepared.marketplacePrices || []);
        existing.colors = [...new Set([...(existing.colors || []), ...(prepared.colors || [])])].slice(0, 10);
        existing.colorsAvailable = [...new Set([...(existing.colorsAvailable || []), ...(prepared.colorsAvailable || [])])].slice(0, 10);
        existing.sizesAvailable = [...new Set([...(existing.sizesAvailable || []), ...(prepared.sizesAvailable || [])])].slice(0, 16);
        existing.features = [...new Set([...(existing.features || []), ...(prepared.features || [])])].slice(0, 12);
        existing.material = existing.material || prepared.material || "";
        existing.soleType = existing.soleType || prepared.soleType || "";
        existing.clicks = Math.max(Number(existing.clicks) || 0, Number(prepared.clicks) || 0);
        existing.priceHistory = [
          ...(Array.isArray(existing.priceHistory) ? existing.priceHistory : []),
          {
            price: existing.bestPrice,
            date: new Date(),
          },
        ].slice(-20);
        existing.lastUpdated = new Date();

        await existing.save();
        await recordPriceHistory(existing._id, existing.marketplaces, existing.bestPrice);
        counters.updated += 1;
      } else {
        const nextIdValue = counters.nextId;
        counters.nextId += 1;
        const created = await Shoe.create({
          id: nextIdValue,
          name: prepared.name,
          uniqueKey: prepared.uniqueKey,
          brand: prepared.brand,
          brandName: prepared.brandName || prepared.brand,
          modelName: prepared.modelName || prepared.name,
          fullTitle: prepared.fullTitle || prepared.name,
          description: prepared.description || "",
          image: prepared.image,
          images: prepared.images || [prepared.image],
          category: prepared.category,
          gender: prepared.gender,
          price: prepared.bestPrice,
          prices: prepared.prices.map((entry) => ({
            source: entry.source,
            platform: entry.platform || entry.source,
            price: entry.price,
            link: entry.link || "",
          })),
          reviews: prepared.reviews || [],
          totalReviews: prepared.totalReviews || 0,
          topReviews: prepared.topReviews || prepared.reviews || [],
          reviewHighlights: prepared.reviewHighlights || [],
          marketplaces: mergeMarketplaceOffers(prepared.marketplaces || [], prepared.marketplacePrices || []),
          buyLink: prepared.buyLink || prepared.link || "",
          productUrl: prepared.productUrl || prepared.buyLink || prepared.link || "",
          availability: prepared.availability || "Unknown",
          bestPrice: prepared.bestPrice,
          priceHistory: [
            {
              price: prepared.bestPrice,
              date: new Date(),
            },
          ],
          rating: prepared.rating || 4,
          popularity: prepared.popularity || 80,
          clicks: prepared.clicks || 0,
          retailers: prepared.prices.length,
          lastUpdated: new Date(),
          colors: prepared.colors || [],
          colorsAvailable: prepared.colorsAvailable || prepared.colors || [],
          sizesAvailable: prepared.sizesAvailable || [],
          match: prepared.match || "",
          story: prepared.story || "",
          features: prepared.features || [],
          material: prepared.material || "",
          soleType: prepared.soleType || "",
          weight: prepared.weight || "",
          drop: prepared.drop || "",
          cushioning: prepared.cushioning || "",
          accent: prepared.accent || undefined,
          performance: prepared.performance || [],
        });
        await recordPriceHistory(created._id, created.marketplaces, created.bestPrice);
        counters.added += 1;
      }
    } catch (error) {
      counters.failed += 1;
      console.log("Ingestion error:", error.message);
    }
  }

  for (let index = 0; index < normalizedProducts.length; index += batchSize) {
    const batch = normalizedProducts.slice(index, index + batchSize);
    await Promise.all(batch.map((product) => saveProduct(product)));
  }

  console.log(`Processed: ${normalizedProducts.length}`);
  console.log(`TOTAL SAVED: ${counters.added + counters.updated}`);
  console.log(
    `Scraping completed. Added ${counters.added}, updated ${counters.updated}, failed ${counters.failed}.`
  );
  clearCache();
  await maybeTrainMlModel(await Shoe.find({}).limit(500).lean());

  return {
    added: counters.added,
    updated: counters.updated,
    failed: counters.failed,
    totalScraped: normalizedProducts.length,
  };
}

async function ingestShoes() {
  const products = await runScrapers();
  return ingestProducts(products);
}

module.exports = {
  ingestProducts,
  ingestShoes,
};
