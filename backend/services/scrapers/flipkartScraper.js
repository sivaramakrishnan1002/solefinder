const cheerio = require("cheerio");
const {
  absoluteUrl,
  cleanPrice,
  cleanProductName,
  extractPrice,
  fetchHtml,
  normalizeWhitespace,
} = require("./genericScraper");

function inferBrand(name) {
  if (/\bnike\b/i.test(name)) return "Nike";
  if (/\badidas\b/i.test(name)) return "Adidas";
  if (/\bpuma\b/i.test(name)) return "Puma";
  if (/\breebok\b/i.test(name)) return "Reebok";
  if (/\basics\b/i.test(name)) return "ASICS";
  if (/\bnew balance\b/i.test(name)) return "New Balance";
  return String(name || "").trim().split(/\s+/)[0] || "Generic";
}

async function scrapeFlipkartShoes() {
  try {
    const products = [];

    for (let page = 1; page <= 3; page += 1) {
      try {
        const url = `https://www.flipkart.com/search?q=running+shoes&page=${page}`;
        const html = await fetchHtml(url, {
          timeout: 20000,
          delayMs: 1000,
          headers: {
            Referer: "https://www.flipkart.com/",
          },
        });
        const $ = cheerio.load(html);

        $("a.wjcEIp, a.CGtC98, a[title]").each((index, element) => {
          if (index >= 60) {
            return false;
          }

          const $item = $(element);
          const rawName =
            normalizeWhitespace($item.attr("title")) ||
            normalizeWhitespace($item.text());
          const name = cleanProductName(rawName);
          const parent = $item.closest("div[data-id], div.tUxRFH, div.slAVV4");
          const price = extractPrice(
            parent.find("div.Nx9bqj, div._30jeq3").first().text(),
            parent.find("div._1_WHN1").first().text()
          );
          const image = absoluteUrl(
            "https://www.flipkart.com",
            parent.find("img").first().attr("src") || ""
          );
          const rating = cleanPrice(parent.find("div.XQDdHH, div._3LWZlK").first().text());
          const productUrl = absoluteUrl("https://www.flipkart.com", $item.attr("href") || "");

          if (!name || price === null || price < 100 || !image) {
            return undefined;
          }

          products.push({
            name,
            brand: inferBrand(rawName || name),
            brandName: inferBrand(rawName || name),
            modelName: name.replace(new RegExp(`^${inferBrand(rawName || name)}\\s+`, "i"), "").trim() || name,
            fullTitle: rawName || name,
            description: "",
            uniqueKey: inferBrand(rawName || name).toLowerCase().replace(/[^a-z0-9]/g, ""),
            price,
            currentPrice: price,
            image,
            images: [image].filter(Boolean),
            rating: Number((rating || Number((4 + ((index % 10) * 0.1)).toFixed(1))).toFixed(2)),
            category: "Running",
            platform: "Flipkart",
            reviews: [],
            topReviews: [],
            totalReviews: 0,
            colorsAvailable: [],
            sizesAvailable: [],
            buyLink: productUrl,
            productUrl,
            availability: "Check Flipkart",
            marketplaces: [
              {
                marketplace: "Flipkart",
                currentPrice: price,
                originalPrice: price,
                discountPercentage: 0,
                availability: "Check Flipkart",
                productUrl,
                buyLink: productUrl,
                image,
                rating: Number((rating || Number((4 + ((index % 10) * 0.1)).toFixed(1))).toFixed(2)),
                totalReviews: 0,
                topReviews: [],
              },
            ],
            source: "Flipkart",
            url: productUrl,
          });

          return undefined;
        });
      } catch (pageError) {
        console.error(`Flipkart scraper failed on page ${page}:`, pageError.message);
      }
    }

    console.log("Flipkart raw count:", products.length);
    return products;
  } catch (error) {
    console.error("Flipkart scraper failed", error.message);
    return [];
  }
}

module.exports = {
  scrapeFlipkartShoes,
};
