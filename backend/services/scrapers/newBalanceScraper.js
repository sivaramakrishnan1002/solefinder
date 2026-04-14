const { scrapeWithConfig } = require("./genericScraper");

const newBalanceConfig = {
  url: "https://www.newbalance.com/men/shoes/running/",
  baseUrl: "https://www.newbalance.com",
  source: "New Balance",
  brand: "New Balance",
  category: "Running",
  limit: 25,
  delayMs: 1000,
  productSelector: '[data-testid="product-card"], .product-tile, .product',
  nameSelector: '[data-testid="product-name"], .product-name, .product-card__title',
  priceSelector: '[data-testid="product-price"], .product-price, .price-sales',
  imageSelector: "img",
  linkSelector: "a",
};

async function scrapeNewBalanceShoes() {
  try {
    return await scrapeWithConfig(newBalanceConfig);
  } catch (error) {
    console.error("New Balance scraper failed", error.message);
    return [];
  }
}

module.exports = {
  scrapeNewBalanceShoes,
};
