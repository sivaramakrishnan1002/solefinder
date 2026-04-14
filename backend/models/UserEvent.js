const mongoose = require("mongoose");

const userEventSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shoe",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: ["click", "view", "wishlist"],
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

userEventSchema.index({ productId: 1, eventType: 1, createdAt: -1 });

module.exports = mongoose.model("UserEvent", userEventSchema);
