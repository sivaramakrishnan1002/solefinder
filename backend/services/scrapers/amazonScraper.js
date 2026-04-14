const cheerio = require("cheerio");
const {
  absoluteUrl,
  cleanPrice,
  cleanProductName,
  extractPrice,
  fetchHtml,
  normalizeWhitespace,
} = require("./genericScraper");
const {
  scrapeAmazonSearchQuery,
} = require("./amazonPlaywrightService");

const BRAND_PATTERNS = [
  ["Nike", /\bnike\b/i],
  ["Adidas", /\badidas\b/i],
  ["Puma", /\bpuma\b/i],
  ["Reebok", /\breebok\b/i],
  ["ASICS", /\basics\b/i],
  ["New Balance", /\bnew balance\b/i],
];

const CATEGORIES = ["running shoes", "casual shoes", "sneakers", "sports shoes"];
const GENDERS = ["men", "women"];

function buildAmazonSearchUrl(name = "") {
  return `https://www.amazon.in/s?k=${encodeURIComponent(String(name || "").trim())}`;
}

function inferBrand(name) {
  const match = BRAND_PATTERNS.find(([, pattern]) => pattern.test(name));
  return match ? match[0] : String(name || "").trim().split(/\s+/)[0] || "Generic";
}

function inferCategory(name, queryCategory = "") {
  const normalized = `${name} ${queryCategory}`.toLowerCase();

  if (normalized.includes("running")) {
    return "Running";
  }

  if (normalized.includes("casual")) {
    return "Casual";
  }

  if (normalized.includes("sneaker")) {
    return "Sneakers";
  }

  if (normalized.includes("sport")) {
    return "Sports";
  }

  return "Other";
}

function inferGender(query = "") {
  if (String(query).toLowerCase().includes("women")) {
    return "Women";
  }

  if (String(query).toLowerCase().includes("men")) {
    return "Men";
  }

  return "Unisex";
}

async function scrapeAmazonShoes() {
  try {
    const products = [];

    for (const gender of GENDERS) {
      for (const category of CATEGORIES) {
        const query = `${gender} ${category}`;
        try {
          const browserProducts = await scrapeAmazonSearchQuery(query, { limit: 40 });
          if (browserProducts.length > 0) {
            products.push(
              ...browserProducts.map((product) => ({
                ...product,
                brandName: product.brand,
                modelName: product.name.replace(new RegExp(`^${product.brand}\\s+`, "i"), "").trim() || product.name,
                fullTitle: product.name,
                description: "",
                colorsAvailable: [],
                sizesAvailable: [],
                totalReviews: Array.isArray(product.reviews) ? product.reviews.length : 0,
                topReviews: Array.isArray(product.reviews) ? product.reviews.slice(0, 5) : [],
                category: inferCategory(product.name, category),
                gender: inferGender(query),
              }))
            );
            continue;
          }
        } catch (browserError) {
          console.warn(`Amazon Playwright scrape failed for "${query}":`, browserError.message);
        }

        const url = `https://www.amazon.in/s?k=${query.replace(/\s+/g, "+")}`;
        const html = await fetchHtml(url, {
          timeout: 20000,
          delayMs: 1500,
        });
        const $ = cheerio.load(html);

        $('[data-component-type="s-search-result"]').each((index, element) => {
          if (index >= 50) {
            return false;
          }

          const $card = $(element);
          const rawName = normalizeWhitespace($card.find("h2 span").first().text());
          const name = cleanProductName(rawName);
          const whole = $card.find(".a-price-whole").first().text();
          const fraction = $card.find(".a-price-fraction").first().text();
          const price = extractPrice(
            `${whole}.${fraction || "0"}`,
            $card.find(".a-price .a-offscreen").first().text(),
            $card.find(".a-price").first().text(),
            $card.find(".a-text-price").first().text()
          );
          const image = absoluteUrl(
            "https://www.amazon.in",
            $card.find("img.s-image").first().attr("src") || ""
          );
          const urlPath =
            $card.find("a.a-link-normal.s-no-outline").first().attr("href") || "";
          const productURL = urlPath
            ? absoluteUrl("https://www.amazon.in", urlPath)
            : buildAmazonSearchUrl(name);
          const rating = cleanPrice($card.find(".a-icon-alt").first().text());
          const availabilityText = normalizeWhitespace(
            $card.find(".a-color-price, .a-text-bold").first().text()
          );

          if (!name || price === null || price <= 0 || price < 100) {
            return undefined;
          }

          console.log("Scraped buyLink:", productURL);

          products.push({
            name,
            brand: inferBrand(rawName || name),
            brandName: inferBrand(rawName || name),
            modelName: name.replace(new RegExp(`^${inferBrand(rawName || name)}\\s+`, "i"), "").trim() || name,
            fullTitle: rawName || name,
            description: "",
            price,
            currentPrice: price,
            image,
            images: [image].filter(Boolean),
            rating: Number((rating || Number((4 + ((index % 10) * 0.1)).toFixed(1))).toFixed(2)),
            category: inferCategory(name, category),
            gender: inferGender(query),
            platform: "Amazon",
            reviews: [],
            topReviews: [],
            totalReviews: 0,
            colorsAvailable: [],
            sizesAvailable: [],
            buyLink: productURL,
            productUrl: productURL,
            availability: availabilityText || "Check Amazon",
            uniqueKey: inferBrand(rawName || name).toLowerCase().replace(/[^a-z0-9]/g, ""),
            marketplacePrices: [
              {
                source: "Amazon",
                platform: "Amazon",
                price,
                buyLink: productURL,
                link: productURL,
              },
            ],
            marketplaces: [
              {
                marketplace: "Amazon",
                currentPrice: price,
                originalPrice: price,
                discountPercentage: 0,
                availability: availabilityText || "Check Amazon",
                productUrl: productURL,
                buyLink: productURL,
                image,
                rating: Number((rating || Number((4 + ((index % 10) * 0.1)).toFixed(1))).toFixed(2)),
                totalReviews: 0,
                topReviews: [],
              },
            ],
            source: "Amazon",
            url: productURL,
          });

          return undefined;
        });
      }
    }

    console.log("Amazon raw count:", products.length);
    return products;
  } catch (error) {
    console.error("Amazon scraper failed", error.message);
    return [];
  }
}

module.exports = {
  scrapeAmazonShoes,
};
