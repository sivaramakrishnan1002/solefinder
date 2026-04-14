require("dotenv").config();

const connectDB = require("./config/db");
const Shoe = require("./models/Shoe");
const {
  mergeProducts,
  normalizeName,
  normalizeProductShape,
} = require("./services/productNormalizationService");

async function normalizeExistingProducts() {
  const shoes = await Shoe.find().sort({ id: 1 });
  const groups = new Map();

  for (const shoe of shoes) {
    const key = `${String(shoe.brand || "").toLowerCase()}::${normalizeName(shoe.name)}`;
    const bucket = groups.get(key) || [];
    bucket.push(shoe);
    groups.set(key, bucket);
  }

  let updated = 0;
  let mergedDuplicates = 0;

  for (const [, group] of groups) {
    const [primary, ...duplicates] = group;
    const merged = mergeProducts(group.map((item) => item.toObject()));

    primary.name = merged.name;
    primary.prices = merged.prices;
    primary.bestPrice = merged.bestPrice;
    primary.price = merged.bestPrice;
    primary.retailers = merged.prices.length;
    primary.lastUpdated = merged.lastUpdated;
    primary.image = merged.image || primary.image;
    primary.category = merged.category || primary.category;
    primary.rating = merged.rating || primary.rating;
    primary.popularity = merged.popularity || primary.popularity;
    await primary.save();
    updated += 1;

    if (duplicates.length > 0) {
      const duplicateIds = duplicates.map((item) => item._id);
      await Shoe.deleteMany({ _id: { $in: duplicateIds } });
      mergedDuplicates += duplicates.length;
    }
  }

  const remaining = await Shoe.find();
  for (const shoe of remaining) {
    const normalized = normalizeProductShape(shoe.toObject());
    shoe.prices = normalized.prices;
    shoe.bestPrice = normalized.bestPrice;
    shoe.price = normalized.bestPrice;
    shoe.retailers = normalized.prices.length;
    shoe.lastUpdated = normalized.lastUpdated;
    await shoe.save();
  }

  return {
    updated,
    mergedDuplicates,
    totalProducts: remaining.length,
  };
}

async function run() {
  try {
    await connectDB();
    const result = await normalizeExistingProducts();
    console.log(
      `Normalization completed. Updated ${result.updated}, merged ${result.mergedDuplicates} duplicates, total ${result.totalProducts}.`
    );
  } catch (error) {
    console.error("Normalization failed", error.message);
    process.exitCode = 1;
  } finally {
    await Shoe.db.close();
  }
}

run();
