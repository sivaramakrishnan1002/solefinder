const mongoose = require("mongoose");

const performanceMetricSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
    },
    value: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const priceEntrySchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
  },
  { _id: false }
);

const marketplaceOfferSchema = new mongoose.Schema(
  {
    marketplace: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
      default: "",
    },
    platform: {
      type: String,
      trim: true,
      default: "",
    },
    currentPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      default: 0,
    },
    availability: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    productUrl: {
      type: String,
      trim: true,
      default: "",
    },
    buyLink: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalReviews: {
      type: Number,
      min: 0,
      default: 0,
    },
    topReviews: {
      type: [reviewSchema],
      default: [],
    },
    scrapedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const priceHistoryEntrySchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

const shoeSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    uniqueKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    brandName: {
      type: String,
      trim: true,
      default: "",
    },
    modelName: {
      type: String,
      trim: true,
      default: "",
    },
    fullTitle: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      trim: true,
      default: "Unisex",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    popularity: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    colorsAvailable: {
      type: [String],
      default: [],
    },
    sizesAvailable: {
      type: [String],
      default: [],
    },
    retailers: {
      type: Number,
      default: 1,
      min: 0,
    },
    prices: {
      type: [priceEntrySchema],
      default: [],
    },
    reviews: {
      type: [reviewSchema],
      default: [],
    },
    totalReviews: {
      type: Number,
      min: 0,
      default: 0,
    },
    topReviews: {
      type: [reviewSchema],
      default: [],
    },
    reviewHighlights: {
      type: [String],
      default: [],
    },
    marketplaces: {
      type: [marketplaceOfferSchema],
      default: [],
    },
    buyLink: {
      type: String,
      trim: true,
      default: "",
    },
    productUrl: {
      type: String,
      trim: true,
      default: "",
    },
    availability: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    bestPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    priceHistory: {
      type: [priceHistoryEntrySchema],
      default: [],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    match: {
      type: String,
      trim: true,
      default: "",
    },
    story: {
      type: String,
      trim: true,
      default: "",
    },
    features: {
      type: [String],
      default: [],
    },
    material: {
      type: String,
      trim: true,
      default: "",
    },
    soleType: {
      type: String,
      trim: true,
      default: "",
    },
    weight: {
      type: String,
      trim: true,
      default: "",
    },
    drop: {
      type: String,
      trim: true,
      default: "",
    },
    cushioning: {
      type: String,
      trim: true,
      default: "",
    },
    accent: {
      type: String,
      trim: true,
      default: "from-gray-200 via-gray-300 to-gray-500",
    },
    performance: {
      type: [performanceMetricSchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    id: false,
  }
);

shoeSchema.index({ brandName: 1, modelName: 1 }, { sparse: true });

module.exports = mongoose.model("Shoe", shoeSchema);
