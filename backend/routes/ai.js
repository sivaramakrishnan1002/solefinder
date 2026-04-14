const express = require("express");
const {
  analyzeAiProduct,
  getAiRecommendations,
  getAiSimilarProducts,
  getAiTopProducts,
} = require("../controllers/aiController");

const router = express.Router();

router.get("/recommend", getAiRecommendations);
router.get("/similar/:id", getAiSimilarProducts);
router.get("/top", getAiTopProducts);
router.post("/analyze", analyzeAiProduct);

module.exports = router;
