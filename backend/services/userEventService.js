const mongoose = require("mongoose");
const Shoe = require("../models/Shoe");
const UserEvent = require("../models/UserEvent");
const { clearCache } = require("./cacheService");
const { maybeTrainMlModel } = require("./mlRecommendationService");

const EVENT_POPULARITY_WEIGHTS = {
  click: 2,
  view: 1,
  wishlist: 5,
};
const RETRAIN_EVENT_THRESHOLD = 50;
let eventsSinceLastTrain = 0;

async function recordUserEvent(productId, eventType, metadata = {}) {
  if (!productId || !["click", "view", "wishlist"].includes(eventType)) {
    return null;
  }

  const shoe = mongoose.Types.ObjectId.isValid(String(productId))
    ? await Shoe.findById(productId)
    : await Shoe.findOne({ id: Number(productId) });

  if (!shoe) {
    return null;
  }

  await UserEvent.create({
    productId: shoe._id,
    eventType,
    metadata,
  });

  shoe.clicks = Number(shoe.clicks || 0) + (eventType === "click" ? 1 : 0);
  shoe.popularity = Math.min(
    100,
    Number(shoe.popularity || 0) + (EVENT_POPULARITY_WEIGHTS[eventType] || 0)
  );
  shoe.lastUpdated = new Date();
  await shoe.save();
  eventsSinceLastTrain += 1;

  if (eventsSinceLastTrain >= RETRAIN_EVENT_THRESHOLD) {
    eventsSinceLastTrain = 0;
    maybeTrainMlModel(await Shoe.find({}).limit(500).lean()).catch((error) => {
      console.error("Auto retraining after interactions failed:", error.message);
    });
  }

  clearCache();

  return shoe.toObject();
}

async function getProductEventSummary(productId) {
  if (!productId) {
    return {
      click: 0,
      view: 0,
      wishlist: 0,
    };
  }

  const summary = await UserEvent.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(String(productId)),
      },
    },
    {
      $group: {
        _id: "$eventType",
        count: { $sum: 1 },
      },
    },
  ]);

  return summary.reduce(
    (accumulator, entry) => ({
      ...accumulator,
      [entry._id]: entry.count,
    }),
    {
      click: 0,
      view: 0,
      wishlist: 0,
    }
  );
}

module.exports = {
  getProductEventSummary,
  recordUserEvent,
};
