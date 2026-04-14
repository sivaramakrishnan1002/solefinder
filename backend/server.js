require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const {
  filterProducts,
  getPriceTrend,
  scrapeProducts,
} = require("./controllers/productController");
const { compareProducts } = require("./controllers/recommendController");
const { startScheduler } = require("./services/schedulerService");
const { ingestShoes } = require("./services/ingestionService");
const productRoutes = require("./routes/products");
const recommendRoutes = require("./routes/recommend");
const aiRoutes = require("./routes/ai");
const { sendError } = require("./services/apiResponseService");

const app = express();
const PORT = process.env.PORT || 5000;
const scrapeRequests = new Map();

function scrapeRateLimiter(req, res, next) {
  const key = req.ip || "global";
  const now = Date.now();
  const previous = scrapeRequests.get(key) || 0;

  if (now - previous < 60 * 1000) {
    return sendError(res, 429, "Scrape rate limit exceeded");
  }

  scrapeRequests.set(key, now);
  return next();
}

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "*",
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.send("SoleFinder API Running");
});

app.use("/api/products", productRoutes);
app.post("/api/filter", filterProducts);
app.post("/api/compare", compareProducts);
app.get("/api/price-trend/:id", getPriceTrend);
app.post("/api/scrape", scrapeRateLimiter, scrapeProducts);
app.use("/api/recommend", recommendRoutes);
app.use("/api/ai", aiRoutes);

app.use((err, req, res, _next) => {
  console.error("GLOBAL ERROR:", err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
    path: req.originalUrl,
  });
});

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`SoleFinder backend listening on port ${PORT}`);
    startScheduler(async () => {
      const result = await ingestShoes();
      console.log("Database updated successfully");
      return result;
    });
  });
}

startServer().catch((error) => {
  console.error("Unable to start SoleFinder backend", error.message);
  process.exit(1);
});
