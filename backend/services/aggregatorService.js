const { scrapeAmazonShoes } = require("./scrapers/amazonScraper");
const { scrapeMyntraShoes } = require("./scrapers/myntraScraper");
const { scrapeFlipkartShoes } = require("./scrapers/flipkartScraper");
const { scrapeAjioShoes } = require("./scrapers/ajioScraper");
async function runScrapers() {
  console.log("Running marketplace scrapers only...");

  const allProducts = [];
  const coreSources = [
    { name: "Amazon", run: scrapeAmazonShoes },
    { name: "Myntra", run: scrapeMyntraShoes },
  ];
  const optionalSources = [
    { name: "Flipkart", run: scrapeFlipkartShoes },
    { name: "Ajio", run: scrapeAjioShoes },
  ];
  const coreResults = await Promise.allSettled(coreSources.map((source) => source.run()));
  const optionalResults = await Promise.allSettled(
    optionalSources.map((source) => source.run())
  );

  coreResults.forEach((result, index) => {
    const sourceName = coreSources[index].name;
    const rawProducts =
      result.status === "fulfilled" && Array.isArray(result.value) ? result.value : [];

    console.log(`${sourceName}: ${rawProducts.length}`);
    allProducts.push(...rawProducts);
  });

  optionalResults.forEach((result, index) => {
    const sourceName = optionalSources[index].name;

    if (result.status === "fulfilled") {
      const rawProducts = Array.isArray(result.value) ? result.value : [];
      console.log(`${sourceName}: ${rawProducts.length}`);
      allProducts.push(...rawProducts);
    } else {
      console.log(`${sourceName}: FAILED`);
    }
  });

  console.log(`TOTAL SCRAPED: ${allProducts.length}`);
  console.log(`Aggregator returning: ${allProducts.length}`);

  return allProducts;
}

async function aggregateShoes() {
  return runScrapers();
}

module.exports = {
  aggregateShoes,
  runScrapers,
};
