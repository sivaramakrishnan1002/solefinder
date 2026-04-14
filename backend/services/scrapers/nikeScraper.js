const { scrapeWithConfig } = require("./genericScraper");

const nikeConfig = {
  url: "https://www.nike.com/w/mens-running-shoes-37v7jznik1zy7ok",
  baseUrl: "https://www.nike.com",
  source: "Nike",
  brand: "Nike",
  category: "Running",
  limit: 25,
  delayMs: 1000,
  productSelector: '[data-testid="product-card"]',
  nameSelector: '[data-testid="product-card__title"], .product-card__title',
  priceSelector: '[data-testid="product-price"], .product-price',
  imageSelector: "img",
  linkSelector: "a",
};

async function scrapeNikeShoes() {
  try {
    return await scrapeWithConfig(nikeConfig);
  } catch (error) {
    console.error("Nike scraper failed", error.message);
    return [];
  }
}

module.exports = {
  scrapeNikeShoes,
};
