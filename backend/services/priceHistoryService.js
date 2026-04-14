const PriceHistory = require("../models/PriceHistory");

async function recordPriceHistory(productId, marketplaces = [], fallbackPrice = 0) {
  if (!productId) {
    return;
  }

  const entries = Array.isArray(marketplaces)
    ? marketplaces
        .map((marketplace) => ({
          productId,
          marketplace:
            String(
              marketplace?.marketplace ||
                marketplace?.platform ||
                marketplace?.source ||
                "Unknown"
            ).trim() || "Unknown",
          price: Number(
            marketplace?.currentPrice ??
              marketplace?.price ??
              fallbackPrice
          ),
          timestamp: new Date(),
        }))
        .filter((entry) => Number.isFinite(entry.price) && entry.price > 0)
    : [];

  if (entries.length === 0 && Number.isFinite(Number(fallbackPrice)) && Number(fallbackPrice) > 0) {
    entries.push({
      productId,
      marketplace: "BestPrice",
      price: Number(fallbackPrice),
      timestamp: new Date(),
    });
  }

  if (entries.length === 0) {
    return;
  }

  await PriceHistory.insertMany(entries, { ordered: false }).catch(() => {});
}

async function getPriceTrendForProduct(productId, limit = 60) {
  if (!productId) {
    return [];
  }

  return PriceHistory.find({ productId })
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();
}

module.exports = {
  getPriceTrendForProduct,
  recordPriceHistory,
};
