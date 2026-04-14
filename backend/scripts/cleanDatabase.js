require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Shoe = require("../models/Shoe");
const { normalizeName } = require("../services/productNormalizationService");

function buildInvalidQuery() {
  return {
    $or: [
      { bestPrice: { $lte: 0 } },
      { name: { $exists: false } },
      { name: null },
      { name: "" },
      { image: { $exists: false } },
      { image: null },
      { image: "" },
      { prices: { $exists: false } },
      { prices: { $size: 0 } },
      {
        $nor: [
          {
            prices: {
              $elemMatch: {
                price: { $gt: 0 },
              },
            },
          },
        ],
      },
    ],
  };
}

async function cleanDatabase() {
  await connectDB();

  try {
    const invalidQuery = buildInvalidQuery();
    const deletedResult = await Shoe.deleteMany(invalidQuery);
    const products = await Shoe.find({}).sort({ id: 1 }).lean();
    const seen = new Map();
    let duplicateDeletes = 0;

    for (const product of products) {
      const key = `${normalizeName(product.name)}-${String(product.brand || "").toLowerCase()}`;

      if (!key.trim() || !product._id) {
        continue;
      }

      if (seen.has(key)) {
        await Shoe.deleteOne({ _id: product._id });
        duplicateDeletes += 1;
      } else {
        seen.set(key, product._id);
      }
    }

    const remaining = await Shoe.countDocuments({
      bestPrice: { $gt: 0 },
      image: { $nin: ["", null] },
      name: { $nin: ["", null] },
      prices: {
        $elemMatch: {
          price: { $gt: 0 },
        },
      },
    });

    console.log(`Total deleted: ${(deletedResult.deletedCount || 0) + duplicateDeletes}`);
    console.log(`Remaining products: ${remaining}`);
  } finally {
    await mongoose.connection.close();
  }
}

cleanDatabase().catch((error) => {
  console.error("Database cleanup failed:", error.message);
  process.exitCode = 1;
});
