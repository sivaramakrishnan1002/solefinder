const { scrapeWithConfig } = require("./genericScraper");

const reebokConfig = {
  url: "https://www.reebok.com/search/running",
  baseUrl: "https://www.reebok.com",
  source: "Reebok",
  brand: "Reebok",
  category: "Running",
  limit: 25,
  delayMs: 1000,
  productSelector: '[data-auto-id="product-card"], .product-card, .product-tile',
  nameSelector: '[data-auto-id="product-title"], .product-card__title, .product-name',
  priceSelector: '[data-auto-id="product-price"], .gl-price-item, .price',
  imageSelector: "img",
  linkSelector: "a",
};

async function scrapeReebokShoes() {
  try {
    return await scrapeWithConfig(reebokConfig);
  } catch (error) {
    console.error("Reebok scraper failed", error.message);
    return [];
  }
}

module.exports = {
  scrapeReebokShoes,
};
