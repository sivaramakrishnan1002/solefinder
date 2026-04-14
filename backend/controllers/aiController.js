const mongoose = require("mongoose");
const Shoe = require("../models/Shoe");
const dataService = require("../services/dataService");
const {
  computeScore,
  enrichProductWithAi,
  rankProducts,
} = require("../services/aiRecommendationService");
const { analyzeProductUrl } = require("../services/aiAnalyzeService");
const { normalizeProductShape } = require("../services/productNormalizationService");
const { sendError, sendSuccess } = require("../services/apiResponseService");

async function getAiRecommendations(req, res, next) {
  try {
    const {
      brand = "",
      category = "",
      budget,
      minPrice,
      maxPrice,
      limit,
    } = req.query;
    const budgetValue = Number(budget) || 0;

    const upperPriceBound =
      budgetValue > 0
        ? budgetValue
        : maxPrice;

    const products = await dataService.getAiCandidateShoes({
      brand,
      category,
      minPrice,
      maxPrice: upperPriceBound,
      limit: limit || 100,
    });

    if (!Array.isArray(products)) {
      return sendSuccess(res, [], 200, []);
    }

    const ranked = rankProducts(
      products.filter(Boolean),
      {
        brand,
        category,
        budget: budgetValue,
      }
    )
      .filter((product) => {
        if (!product) {
          return false;
        }

        if (brand && String(product.brand || "").toLowerCase() !== String(brand).toLowerCase()) {
          return false;
        }

        if (
          category &&
          String(product.category || "").toLowerCase() !== String(category).toLowerCase()
        ) {
          return false;
        }

        if (budgetValue > 0 && Number(product.bestPrice ?? product.price) > budgetValue) {
          return false;
        }

        return true;
      })
      .map((product) => ({
        ...product,
        aiScore: Number(product.aiScore || 0).toFixed(2),
        score: Number(product.aiScore || 0),
      }))
      .slice(0, 20);

    const result = Array.isArray(ranked) ? ranked : [];
    return sendSuccess(res, result, 200, result);
  } catch (error) {
    console.error("AI ERROR:", error);
    return sendError(res, 500, "AI failed");
  }
}

async function getAiSimilarProducts(req, res, next) {
  try {
    const { id } = req.params;
    const product = mongoose.Types.ObjectId.isValid(id)
      ? await Shoe.findById(id).lean()
      : await Shoe.findOne({ id: Number(id) }).lean();

    if (!product) {
      return sendError(res, 404, "Product not found");
    }

    const normalizedProduct = normalizeProductShape(product);
    const basePrice = Number(normalizedProduct.bestPrice ?? normalizedProduct.price) || 0;
    const minPrice = basePrice > 0 ? basePrice * 0.7 : 0;
    const maxPrice = basePrice > 0 ? basePrice * 1.3 : Number.MAX_SAFE_INTEGER;
    const primaryMatches = await Shoe.find({
      _id: { $ne: product._id },
      category: product.category,
      $or: [
        { brand: product.brand },
        { brand: new RegExp(String(product.brand || "").trim(), "i") },
      ],
      bestPrice: {
        $gte: minPrice,
        $lte: maxPrice,
      },
    })
      .limit(6)
      .lean();

    let results = primaryMatches;

    if (results.length < 6) {
      results = await Shoe.find({
        _id: { $ne: product._id },
        category: product.category,
        bestPrice: {
          $gte: minPrice,
          $lte: maxPrice,
        },
      })
        .limit(6)
        .lean();
    }

    const similar = results
      .map((item) => {
        const normalizedItem = normalizeProductShape(item);
        const aiScore = computeScore(normalizedItem, {
          budget: normalizedProduct.bestPrice || 5000,
        });

        return {
          ...normalizedItem,
          aiScore: Number(aiScore.toFixed(2)),
          score: Number(aiScore.toFixed(2)),
        };
      })
      .sort((left, right) => (right.aiScore || 0) - (left.aiScore || 0));

    const result = Array.isArray(similar) ? similar : [];
    return sendSuccess(res, result, 200, result);
  } catch (error) {
    console.error("SIMILAR ERROR:", error);
    return sendError(res, 500, "Similar failed");
  }
}

async function getAiTopProducts(_req, res) {
  try {
    const products = await dataService.getAiCandidateShoes({
      limit: 100,
    });

    if (!Array.isArray(products)) {
      return sendSuccess(res, [], 200, []);
    }

    const ranked = rankProducts(products, {}).slice(0, 20).map((product) => ({
      ...product,
      aiScore: Number(product.aiScore || 0).toFixed(2),
      score: Number(product.aiScore || 0),
    }));

    const result = Array.isArray(ranked) ? ranked : [];
    return sendSuccess(res, result, 200, result);
  } catch (error) {
    console.error("AI TOP ERROR:", error);
    return sendError(res, 500, "AI top failed");
  }
}

async function analyzeAiProduct(req, res) {
  try {
    const { url } = req.body || {};

    if (!url || typeof url !== "string") {
      return sendError(res, 400, "Invalid URL");
    }

    const trimmedUrl = url.trim();
    const normalizedUrl = trimmedUrl.toLowerCase();
    const product = await analyzeProductUrl(trimmedUrl);

    if (!product || !product.name) {
      return res.status(400).json({
        success: false,
        data: null,
        error: normalizedUrl.includes("flipkart.com")
          ? "Unable to analyze Flipkart product currently"
          : "Unable to analyze this URL",
        message: normalizedUrl.includes("flipkart.com")
          ? "Unable to analyze Flipkart product currently"
          : "Unable to analyze this URL",
        reason: normalizedUrl.includes("flipkart.com")
          ? "Flipkart blocked or unavailable right now"
          : "Unsupported or blocked page",
      });
    }

    const aiScore = computeScore(product, { budget: 5000 });
    const enriched = enrichProductWithAi(product, { budget: 5000 });
    const payload = {
      name: enriched.name,
      brand: enriched.brand,
      image: enriched.image,
      images: Array.isArray(enriched.images) ? enriched.images : [enriched.image].filter(Boolean),
      price: enriched.price,
      rating: Number((Number(enriched.rating) || 0).toFixed(2)),
      aiScore,
      verdict: enriched.verdict,
      recommendation: enriched.verdict,
      explanation: enriched.explanation,
      priceInsight: enriched.priceInsight,
      reviewSummary: enriched.reviewSummary,
      buyLink: enriched.buyLink || enriched.link || "",
      prices: enriched.prices || [],
    };

    return sendSuccess(res, payload, 200, payload);
  } catch (error) {
    console.error("AI ANALYZE ERROR:", error);
    return res.status(500).json({
      success: false,
      data: null,
      error: "Unable to analyze this URL",
      message: "Unable to analyze this URL",
      reason: "Unsupported or blocked page",
    });
  }
}

module.exports = {
  analyzeAiProduct,
  getAiRecommendations,
  getAiSimilarProducts,
  getAiTopProducts,
};
