const { scrapeWithConfig } = require("./genericScraper");

const adidasConfig = {
  url: "https://www.adidas.com/us/men-running-shoes",
  baseUrl: "https://www.adidas.com",
  source: "Adidas",
  brand: "Adidas",
  category: "Running",
  limit: 25,
  delayMs: 1000,
  productSelector: '[data-auto-id="product-card"]',
  nameSelector: '[data-auto-id="product-title"], .glass-product-card__title',
  priceSelector: '[data-auto-id="product-price"], .gl-price-item',
  imageSelector: "img",
  linkSelector: "a",
};

async function scrapeAdidasShoes() {
  try {
    return await scrapeWithConfig(adidasConfig);
  } catch (error) {
    console.error("Adidas scraper failed", error.message);
    return [];
  }
}

module.exports = {
  scrapeAdidasShoes,
};
