const dataService = require("../services/dataService");
const { ingestShoes } = require("../services/ingestionService");
const { sendError, sendSuccess } = require("../services/apiResponseService");
const { recordUserEvent } = require("../services/userEventService");

async function getAllProducts(req, res, next) {
  try {
    const result = await dataService.getAllShoes(req.query);
    return sendSuccess(res, result, 200, result);
  } catch (error) {
    return next(error);
  }
}

async function filterProducts(req, res, next) {
  try {
    const payload = req.body || {};
    const result = await dataService.filterShoes(payload);
    return sendSuccess(res, result, 200, result);
  } catch (error) {
    return next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const shoe = await dataService.getShoeById(req.params.id);

    if (!shoe) {
      return sendError(res, 404, "Product not found");
    }

    return sendSuccess(res, shoe, 200, shoe);
  } catch (error) {
    return next(error);
  }
}

async function searchProducts(req, res, next) {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return sendSuccess(res, [], 200, { products: [] });
    }

    const products = await dataService.searchShoes(query, {
      limit: req.query.limit,
    });

    return sendSuccess(res, products, 200, { products });
  } catch (error) {
    console.error("SEARCH ERROR:", error);
    return sendError(res, 500, "Search failed", { products: [] });
  }
}

async function createProduct(req, res, next) {
  try {
    const {
      id,
      name,
      brand,
      category,
      price,
      rating,
      popularity,
      image,
    } = req.body;

    if (
      [id, name, brand, category, price, rating, popularity, image].some(
        (value) => value === undefined || value === null || value === ""
      )
    ) {
      return res.status(400).json({ message: "Missing required shoe fields" });
    }

    const created = await dataService.createShoe({
      ...req.body,
      id: Number(id),
      price: Number(price),
      rating: Number(rating),
      popularity: Number(popularity),
      retailers:
        req.body.retailers === undefined ? 1 : Number(req.body.retailers),
    });

    return sendSuccess(res, created, 201, created);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, "A shoe with that id already exists");
    }

    return next(error);
  }
}

async function scrapeProducts(_req, res, next) {
  try {
    const result = await ingestShoes();
    return sendSuccess(
      res,
      {
        message: "Scraping completed",
        added: result.added,
        updated: result.updated,
        totalScraped: result.totalScraped,
      },
      200,
      {
      message: "Scraping completed",
      added: result.added,
      updated: result.updated,
      totalScraped: result.totalScraped,
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function getPriceTrend(req, res, next) {
  try {
    const trend = await dataService.getPriceTrend(req.params.id);
    const safeTrend = Array.isArray(trend) ? trend : [];
    return sendSuccess(res, safeTrend, 200, safeTrend);
  } catch (error) {
    return next(error);
  }
}

async function trackProductEvent(req, res, next) {
  try {
    const { type, metadata } = req.body || {};
    if (!type) {
      return sendError(res, 400, "Event type is required");
    }

    const updated = await recordUserEvent(req.params.id, type, metadata || {});
    if (!updated) {
      return sendError(res, 404, "Product not found");
    }

    return sendSuccess(res, updated, 200, updated);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  filterProducts,
  getAllProducts,
  getProductById,
  getPriceTrend,
  searchProducts,
  trackProductEvent,
  createProduct,
  scrapeProducts,
};
