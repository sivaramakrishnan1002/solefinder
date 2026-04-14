const dataService = require("../services/dataService");
const { buildHybridRecommendations } = require("../services/mlRecommendationService");
const { sendError, sendSuccess } = require("../services/apiResponseService");

async function recommendShoes(req, res, next) {
  try {
    const {
      brand = "",
      category = "",
      budget,
      maxPrice,
      preferredBrands = [],
      gender = "",
      minRating,
    } = req.body || {};

    const budgetValue = Number(budget ?? maxPrice);

    if (!Number.isFinite(budgetValue)) {
      return sendError(res, 400, "A numeric budget or maxPrice is required");
    }

    const candidates = await dataService.getAiCandidateShoes({
      brand,
      category,
      gender,
      rating: minRating,
      maxPrice: budgetValue,
      limit: 120,
    });

    const recommendations = await buildHybridRecommendations(candidates, {
      preferredBrands:
        Array.isArray(preferredBrands) && preferredBrands.length > 0
          ? preferredBrands
          : brand
            ? [brand]
            : [],
      category,
      maxPrice: budgetValue,
      budget: budgetValue,
    });

    const result = recommendations.slice(0, 20);
    return sendSuccess(res, result, 200, result);
  } catch (error) {
    return next(error);
  }
}

function scoreComparisonWinner(product = {}) {
  return (
    (Number(product?.finalScore) || 0) * 100 +
    (Number(product?.rating) || 0) * 5 +
    Math.max(0, 10000 - (Number(product?.bestPrice ?? product?.price) || 0)) / 1000
  );
}

async function compareProducts(req, res, next) {
  try {
    const productIds = Array.isArray(req.body?.product_ids) ? req.body.product_ids : [];

    if (productIds.length < 2) {
      return sendError(res, 400, "At least two product_ids are required");
    }

    const products = await dataService.getShoesByIds(productIds);
    if (products.length < 2) {
      return sendError(res, 404, "Not enough products found for comparison");
    }

    const rankedProducts = [...products].sort(
      (left, right) => (right.finalScore || 0) - (left.finalScore || 0)
    );
    const winner = rankedProducts.reduce((best, product) => {
      if (!best || scoreComparisonWinner(product) > scoreComparisonWinner(best)) {
        return product;
      }
      return best;
    }, null);

    const comparison = {
      success: true,
      data: {
        products: rankedProducts,
        winner: winner
          ? {
              id: winner._id || winner.id,
              name: winner.name,
              brand: winner.brand,
              aiScore: winner.aiScore,
              finalScore: winner.finalScore,
              reasons: Array.isArray(winner.reasons) ? winner.reasons : winner.explanation || [],
            }
          : null,
        metrics: {
          price: rankedProducts.map((product) => ({
            id: product._id || product.id,
            value: Number(product.bestPrice ?? product.price) || 0,
          })),
          rating: rankedProducts.map((product) => ({
            id: product._id || product.id,
            value: Number(product.rating) || 0,
          })),
          aiScore: rankedProducts.map((product) => ({
            id: product._id || product.id,
            value: Number(product.aiScore) || 0,
          })),
          featureCount: rankedProducts.map((product) => ({
            id: product._id || product.id,
            value: Array.isArray(product.features) ? product.features.length : 0,
          })),
        },
      },
      error: null,
    };

    return sendSuccess(res, comparison.data, 200, comparison.data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  compareProducts,
  recommendShoes,
};
