const {
  absoluteUrl,
  cleanProductName,
  extractPrice,
  fetchHtml,
} = require("./genericScraper");

const CATEGORIES = ["running shoes", "casual shoes", "sneakers", "sports shoes"];
const GENDERS = ["men", "women"];

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

async function scrapeMyntraShoes() {
  try {
    const products = [];

    for (const gender of GENDERS) {
      for (const category of CATEGORIES) {
        const slug = `${gender}-${category.replace(/\s+/g, "-")}`;
        const html = await fetchHtml(`https://www.myntra.com/${slug}`, {
          timeout: 20000,
          delayMs: 1500,
        });
        const match = String(html).match(/window\.__myx\s*=\s*(\{[\s\S]*?\})<\/script>/);
        if (!match) {
          continue;
        }

        const data = JSON.parse(match[1]);
        const pageProducts = data.searchData?.results?.products || [];

        for (const entry of pageProducts) {
          const name = cleanProductName(entry.productName || entry.product || "");
          const price = extractPrice(
            entry.discountedPrice,
            entry.price,
            entry.mrp,
            entry.discountLabel
          );
          const image = absoluteUrl(
            "https://assets.myntassets.com",
            entry.searchImage || ""
          );

          if (!name || price === null || price <= 0 || price < 100) {
            continue;
          }

          products.push({
            name,
            brand: String(entry.brand || "").trim() || String(name || "").trim().split(/\s+/)[0] || "Generic",
            brandName: String(entry.brand || "").trim() || String(name || "").trim().split(/\s+/)[0] || "Generic",
            modelName: name.replace(new RegExp(`^${String(entry.brand || "").trim()}\\s+`, "i"), "").trim() || name,
            fullTitle: `${entry.brand || ""} ${entry.productName || entry.product || ""}`.trim() || name,
            description: String(entry.searchProduct || "").trim(),
            price,
            currentPrice: price,
            image,
            images: [image].filter(Boolean),
            rating: Number((Number(entry.rating) || 0).toFixed(2)),
            category: inferCategory(name, category),
            gender: inferGender(gender),
            platform: "Myntra",
            reviews: [],
            topReviews: [],
            totalReviews: Number(entry.ratingCount) || 0,
            colorsAvailable: [],
            sizesAvailable: [],
            buyLink: absoluteUrl(
              "https://www.myntra.com",
              `/${String(entry.landingPageUrl || "").replace(/^\//, "")}`
            ),
            productUrl: absoluteUrl(
              "https://www.myntra.com",
              `/${String(entry.landingPageUrl || "").replace(/^\//, "")}`
            ),
            marketplaces: [
              {
                marketplace: "Myntra",
                currentPrice: price,
                originalPrice: extractPrice(entry.price, entry.mrp, price) || price,
                discountPercentage: 0,
                availability: "Check Myntra",
                productUrl: absoluteUrl(
                  "https://www.myntra.com",
                  `/${String(entry.landingPageUrl || "").replace(/^\//, "")}`
                ),
                buyLink: absoluteUrl(
                  "https://www.myntra.com",
                  `/${String(entry.landingPageUrl || "").replace(/^\//, "")}`
                ),
                image,
                rating: Number((Number(entry.rating) || 0).toFixed(2)),
                totalReviews: Number(entry.ratingCount) || 0,
                topReviews: [],
              },
            ],
            source: "Myntra",
            url: absoluteUrl(
              "https://www.myntra.com",
              `/${String(entry.landingPageUrl || "").replace(/^\//, "")}`
            ),
          });
        }
      }
    }

    console.log("Myntra raw count:", products.length);
    return products;
  } catch (error) {
    console.error("Myntra scraper failed", error.message);
    return [];
  }
}

module.exports = {
  scrapeMyntraShoes,
};
