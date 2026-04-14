const { scrapeWithConfig } = require("./genericScraper");

const asicsConfig = {
  url: "https://www.asics.com/us/en-us/mens-running-shoes/c/aa10201000/",
  baseUrl: "https://www.asics.com",
  source: "ASICS",
  brand: "ASICS",
  category: "Running",
  limit: 25,
  delayMs: 1000,
  productSelector: '[data-testid="product-card"], .product-tile, .product-card',
  nameSelector: '[data-testid="product-name"], .product-name, .product-card__name',
  priceSelector: '[data-testid="product-price"], .price, .product-price',
  imageSelector: "img",
  linkSelector: "a",
};

async function scrapeAsicsShoes() {
  try {
    return await scrapeWithConfig(asicsConfig);
  } catch (error) {
    console.error("ASICS scraper failed", error.message);
    return [];
  }
}

module.exports = {
  scrapeAsicsShoes,
};
