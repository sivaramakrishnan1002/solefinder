const { scrapeWithConfig } = require("./genericScraper");

const pumaConfig = {
  url: "https://us.puma.com/us/en/men/shoes/running",
  baseUrl: "https://us.puma.com",
  source: "Puma",
  brand: "Puma",
  category: "Running",
  limit: 25,
  delayMs: 1000,
  productSelector: '[data-test-id="product-list-item"], .product-tile, .product-item',
  nameSelector: '[data-test-id="product-title"], .product-item__name, .product-name',
  priceSelector: '[data-test-id="price"], .price, .product-item__price',
  imageSelector: "img",
  linkSelector: "a",
};

async function scrapePumaShoes() {
  try {
    return await scrapeWithConfig(pumaConfig);
  } catch (error) {
    console.error("Puma scraper failed", error.message);
    return [];
  }
}

module.exports = {
  scrapePumaShoes,
};
