const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shoe",
      required: true,
      index: true,
    },
    marketplace: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

priceHistorySchema.index({ productId: 1, marketplace: 1, timestamp: -1 });

module.exports = mongoose.model("PriceHistory", priceHistorySchema);
