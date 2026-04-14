const { chromium } = require("playwright");
const {
  absoluteUrl,
  cleanPrice,
  cleanProductName,
  extractPrice,
  normalizeWhitespace,
} = require("./genericScraper");

function buildAmazonSearchUrl(query = "") {
  return `https://www.amazon.in/s?k=${encodeURIComponent(String(query || "").trim())}`;
}

function inferBrand(name = "") {
  return String(name || "").trim().split(/\s+/)[0] || "Generic";
}

async function withAmazonPage(task) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-US",
  });

  try {
    return await task(page);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function scrapeAmazonSearchQuery(query, options = {}) {
  const limit = Math.min(50, Math.max(1, Number(options.limit) || 40));
  const searchUrl = buildAmazonSearchUrl(query);

  return withAmazonPage(async (page) => {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1800);

    const rawProducts = await page.$$eval(
      '[data-component-type="s-search-result"]',
      (cards, maxItems) =>
        cards.slice(0, maxItems).map((card) => {
          const text = (selector) =>
            (card.querySelector(selector)?.textContent || "").replace(/\s+/g, " ").trim();
          const attr = (selector, name) => card.querySelector(selector)?.getAttribute(name) || "";
          const href =
            attr("a.a-link-normal.s-no-outline", "href") ||
            attr("h2 a.a-link-normal", "href") ||
            "";

          return {
            title: text("h2 span"),
            priceWhole: text(".a-price-whole"),
            priceOffscreen: text(".a-price .a-offscreen"),
            image: attr("img.s-image", "src"),
            rating: text(".a-icon-alt"),
            availability: text(".a-color-price, .a-size-base.a-color-base"),
            href,
          };
        }),
      limit
    );

    return rawProducts
      .map((product) => {
        const name = cleanProductName(product.title);
        const price = extractPrice(
          product.priceWhole,
          product.priceOffscreen
        );
        const productUrl = product.href
          ? absoluteUrl("https://www.amazon.in", product.href)
          : buildAmazonSearchUrl(name);
        const image = absoluteUrl("https://www.amazon.in", product.image || "");
        const rating = cleanPrice(product.rating);

        if (!name || price === null || price < 100 || !image) {
          return null;
        }

        return {
          name,
          brand: inferBrand(name),
          uniqueKey: inferBrand(name).toLowerCase().replace(/[^a-z0-9]/g, ""),
          price,
          image,
          images: [image].filter(Boolean),
          rating: Number((rating || 4).toFixed(2)),
          availability: product.availability || "Check Amazon",
          productUrl,
          buyLink: productUrl,
          marketplacePrices: [
            {
              source: "Amazon",
              platform: "Amazon",
              price,
              buyLink: productUrl,
              link: productUrl,
            },
          ],
          platform: "Amazon",
          source: "Amazon",
          reviews: [],
          url: productUrl,
        };
      })
      .filter(Boolean);
  });
}

async function scrapeAmazonProductPage(url) {
  return withAmazonPage(async (page) => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1800);

    const product = await page.evaluate(() => {
      const text = (selector) =>
        (document.querySelector(selector)?.textContent || "").replace(/\s+/g, " ").trim();
      const attr = (selector, name) =>
        document.querySelector(selector)?.getAttribute(name) || "";

      const reviewNodes = Array.from(document.querySelectorAll('[data-hook="review"]')).slice(0, 10);
      const reviews = reviewNodes
        .map((node) => ({
          text:
            (node.querySelector('[data-hook="review-body"] span, [data-hook="review-body"]')
              ?.textContent || "")
              .replace(/\s+/g, " ")
              .trim(),
          rating: parseFloat(
            ((node.querySelector('[data-hook="review-star-rating"] span, .a-icon-alt')
              ?.textContent || "")
              .match(/[0-9.]+/) || [0])[0]
          ) || 0,
        }))
        .filter((review) => review.text);

      return {
        title: text("#productTitle"),
        priceWhole: text(".a-price-whole"),
        priceOffscreen: text(".a-price .a-offscreen"),
        image: attr("#landingImage", "src"),
        gallery: Array.from(document.querySelectorAll("#altImages img"))
          .map((img) => img.getAttribute("src") || "")
          .filter(Boolean)
          .slice(0, 8),
        rating: text(".a-icon-alt"),
        availability:
          text("#availability span") ||
          text("#availability") ||
          "Check Amazon",
        reviews,
      };
    });

    const name = cleanProductName(product.title);
    const price = extractPrice(product.priceWhole, product.priceOffscreen);
    const image = absoluteUrl("https://www.amazon.in", product.image || "");
    const images = [image, ...(product.gallery || []).map((item) => absoluteUrl("https://www.amazon.in", item))]
      .filter(Boolean)
      .filter((item, index, items) => items.indexOf(item) === index)
      .slice(0, 8);
    const rating = cleanPrice(product.rating);
    const productUrl = /^https?:\/\//i.test(url) ? url : buildAmazonSearchUrl(name);

    if (!name || price === null || price < 100) {
      return null;
    }

    return {
      name,
      brand: inferBrand(name),
      uniqueKey: inferBrand(name).toLowerCase().replace(/[^a-z0-9]/g, ""),
      price,
      bestPrice: price,
      image: image || "/no-image.png",
      images: images.length > 0 ? images : [image || "/no-image.png"],
      rating: Number((rating || 4).toFixed(2)),
      availability: product.availability || "Check Amazon",
      buyLink: productUrl,
      productUrl,
      platform: "Amazon",
      source: "Amazon",
      reviews: Array.isArray(product.reviews) ? product.reviews.slice(0, 10) : [],
      prices: [
        {
          source: "Amazon",
          platform: "Amazon",
          price,
          link: productUrl,
        },
      ],
      priceHistory: [
        {
          price,
          date: new Date(),
        },
      ],
    };
  });
}

module.exports = {
  buildAmazonSearchUrl,
  scrapeAmazonProductPage,
  scrapeAmazonSearchQuery,
};
