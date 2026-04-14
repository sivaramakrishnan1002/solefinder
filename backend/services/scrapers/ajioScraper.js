const {
  absoluteUrl,
  cleanProductName,
  extractPrice,
  fetchHtml,
  normalizeWhitespace,
} = require("./genericScraper");

function inferCategory(name) {
  return /trainer|training/i.test(name) ? "Training" : "Running";
}

async function scrapeAjioShoes() {
  try {
    const products = [];

    for (let page = 1; page <= 5; page += 1) {
      const url = `https://www.ajio.com/search/?text=running%20shoes&page=${page}`;
      const html = await fetchHtml(url, {
        timeout: 20000,
        delayMs: 1000,
      });

      const matches = String(html).match(/"products":(\[[\s\S]*?\]),"sorts"/);
      if (!matches) {
        continue;
      }

      const items = JSON.parse(matches[1]);

      for (const item of items.slice(0, 40)) {
        const rawName = normalizeWhitespace(item.name || item.productName || "");
        const name = cleanProductName(rawName);
        const price = extractPrice(item.discountedPrice, item.price, item.offerPrice);
        const image = absoluteUrl(
          "https://assets.ajio.com",
          item.images?.[0]?.url || item.imageUrl || ""
        );

        if (!name || !price || !image) {
          continue;
        }

        products.push({
          name,
          brand: String(item.brand || "").trim() || String(name || "").trim().split(/\s+/)[0] || "Generic",
          brandName: String(item.brand || "").trim() || String(name || "").trim().split(/\s+/)[0] || "Generic",
          modelName:
            name.replace(
              new RegExp(`^${String(item.brand || "").trim()}\\s+`, "i"),
              ""
            ).trim() || name,
          fullTitle: rawName || name,
          description: "",
          uniqueKey:
            (String(item.brand || "").trim() || String(name || "").trim().split(/\s+/)[0] || "Generic")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, ""),
          price,
          currentPrice: price,
          image,
          images: [image].filter(Boolean),
          rating: Number((Number(item.rating) || 0).toFixed(2)),
          category: inferCategory(name),
          platform: "Ajio",
          reviews: [],
          topReviews: [],
          totalReviews: 0,
          colorsAvailable: [],
          sizesAvailable: [],
          buyLink: absoluteUrl("https://www.ajio.com", item.url || item.productUrl || ""),
          productUrl: absoluteUrl("https://www.ajio.com", item.url || item.productUrl || ""),
          availability: "Check Ajio",
          marketplaces: [
            {
              marketplace: "Ajio",
              currentPrice: price,
              originalPrice: Number(item.price) || price,
              discountPercentage: 0,
              availability: "Check Ajio",
              productUrl: absoluteUrl("https://www.ajio.com", item.url || item.productUrl || ""),
              buyLink: absoluteUrl("https://www.ajio.com", item.url || item.productUrl || ""),
              image,
              rating: Number((Number(item.rating) || 0).toFixed(2)),
              totalReviews: 0,
              topReviews: [],
            },
          ],
          source: "Ajio",
          url: absoluteUrl("https://www.ajio.com", item.url || item.productUrl || ""),
        });
      }
    }

    console.log("Ajio raw count:", products.length);
    return products;
  } catch (error) {
    console.error("Ajio scraper failed", error.message);
    return [];
  }
}

module.exports = {
  scrapeAjioShoes,
};
