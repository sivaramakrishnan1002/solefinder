const express = require("express");
const {
  createProduct,
  getAllProducts,
  getProductById,
  searchProducts,
  scrapeProducts,
  trackProductEvent,
} = require("../controllers/productController");

const router = express.Router();

router.get("/", getAllProducts);
router.get("/search", searchProducts);
router.post("/", createProduct);
router.post("/scrape", scrapeProducts);
router.post("/:id/events", trackProductEvent);
router.get("/:id", getProductById);

module.exports = router;
