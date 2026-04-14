const axios = require("axios");
const cheerio = require("cheerio");
const { chromium } = require("playwright");
const {
  absoluteUrl,
  cleanPrice,
  cleanProductName,
  normalizeWhitespace,
} = require("./scrapers/genericScraper");
const {
  buildAmazonSearchUrl,
  scrapeAmazonProductPage,
} = require("./scrapers/amazonPlaywrightService");

const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Accept-Language": "en-US,en;q=0.9",
};

function detectPlatform(url) {
  const normalizedUrl = String(url || "").toLowerCase();

  if (normalizedUrl.includes("amazon")) {
    return "amazon";
  }

  if (normalizedUrl.includes("myntra")) {
    return "myntra";
  }

  if (normalizedUrl.includes("flipkart")) {
    return "flipkart";
  }

  if (normalizedUrl.includes("ajio")) {
    return "ajio";
  }

  return "";
}

function extractBrand(name = "", fallback = "Generic") {
  const normalized = String(name || "").trim();
  if (!normalized) {
    return fallback;
  }

  const firstToken = normalized.split(/\s+/)[0];
  return firstToken || fallback;
}

function normalizeBuyLink(url = "", fallback = "") {
  const safeUrl = String(url || fallback || "").trim();
  return /^https?:\/\//i.test(safeUrl) ? safeUrl : "";
}

function normalizeImageCollection(...sources) {
  const images = sources
    .flat()
    .map((image) => String(image || "").trim())
    .filter(Boolean);

  return [...new Set(images)].slice(0, 8);
}

function buildProductPayload({
  name,
  brand,
  image,
  images,
  price,
  rating,
  reviews,
  buyLink,
  platform,
}) {
  const numericPrice = Number(price) || 0;
  const normalizedImages = normalizeImageCollection(images, image);
  const primaryImage = normalizedImages[0] || image || "/no-image.png";
  const safeBuyLink = normalizeBuyLink(buyLink);
  const safeBrand = extractBrand(name, brand || "Generic");
  return {
    name,
    brand: safeBrand,
    brandName: safeBrand,
    modelName: cleanProductName(name).replace(new RegExp(`^${safeBrand}\\s+`, "i"), "").trim() || name,
    fullTitle: name,
    description: "",
    image: primaryImage,
    images: normalizedImages.length > 0 ? normalizedImages : [primaryImage],
    price: numericPrice,
    bestPrice: numericPrice,
    rating: Number.isFinite(Number(rating)) ? Number(Number(rating).toFixed(2)) : 4,
    popularity: 80,
    reviews: Array.isArray(reviews) ? reviews.slice(0, 10) : [],
    topReviews: Array.isArray(reviews) ? reviews.slice(0, 5) : [],
    totalReviews: Array.isArray(reviews) ? reviews.length : 0,
    buyLink: safeBuyLink,
    productUrl: safeBuyLink,
    source: platform,
    platform,
    availability: "Check marketplace",
    priceHistory: [
      {
        price: numericPrice,
        date: new Date(),
      },
    ],
    prices: [
      {
        source: platform,
        platform,
        price: numericPrice,
        link: safeBuyLink,
      },
    ],
    marketplaces: [
      {
        marketplace: platform,
        currentPrice: numericPrice,
        originalPrice: numericPrice,
        discountPercentage: 0,
        availability: "Check marketplace",
        productUrl: safeBuyLink,
        buyLink: safeBuyLink,
        image: primaryImage,
        rating: Number.isFinite(Number(rating)) ? Number(Number(rating).toFixed(2)) : 4,
        totalReviews: Array.isArray(reviews) ? reviews.length : 0,
        topReviews: Array.isArray(reviews) ? reviews.slice(0, 5) : [],
      },
    ],
  };
}

function extractReviews($, selectors = []) {
  const reviews = [];

  selectors.forEach((selectorConfig) => {
    if (reviews.length >= 10) {
      return;
    }

    $(selectorConfig.container).each((index, element) => {
      if (index >= 10 || reviews.length >= 10) {
        return false;
      }

      const text = normalizeWhitespace($(element).find(selectorConfig.text).first().text());
      const ratingText = normalizeWhitespace(
        $(element).find(selectorConfig.rating).first().text()
      );
      const rating = parseFloat(String(ratingText).replace(/[^0-9.]/g, ""));

      if (!text) {
        return undefined;
      }

      reviews.push({
        text,
        rating: Number.isFinite(rating) ? rating : 0,
      });

      return undefined;
    });
  });

  return reviews.slice(0, 10);
}

async function resolveUrl(shortUrl) {
  try {
    const response = await axios.get(shortUrl, {
      maxRedirects: 5,
      headers: REQUEST_HEADERS,
      timeout: 15000,
    });

    return response?.request?.res?.responseUrl || shortUrl;
  } catch (_error) {
    return shortUrl;
  }
}

async function scrapeAmazonProduct(url) {
  try {
    const browserProduct = await scrapeAmazonProductPage(url);
    if (browserProduct?.name) {
      return browserProduct;
    }
  } catch (browserError) {
    console.warn("Amazon Playwright analyze failed:", browserError.message);
  }

  const { data } = await axios.get(url, {
    headers: REQUEST_HEADERS,
    timeout: 15000,
  });
  const html = String(data || "");
  const $ = cheerio.load(html);
  const rawName = normalizeWhitespace($("#productTitle").text());
  const name = cleanProductName(rawName);
  const priceText =
    $(".a-price-whole").first().text() ||
    $(".a-price .a-offscreen").first().text();
  const price = Number(String(priceText).replace(/[^0-9]/g, ""));
  const image = absoluteUrl(
    "https://www.amazon.in",
    $("#landingImage").attr("src") || ""
  );
  const images = normalizeImageCollection(
    $("#altImages img")
      .map((_, element) => absoluteUrl("https://www.amazon.in", $(element).attr("src") || ""))
      .get(),
    image
  );
  const rating = parseFloat(String($(".a-icon-alt").first().text()).replace(/[^0-9.]/g, ""));
  const reviews = extractReviews($, [
    {
      container: '[data-hook="review"]',
      text: '[data-hook="review-body"] span, [data-hook="review-body"]',
      rating: '[data-hook="review-star-rating"] span, .a-icon-alt',
    },
  ]);
  const safeUrl = /^https?:\/\//i.test(url) ? url : buildAmazonSearchUrl(name);

  return buildProductPayload({
    name,
    brand: extractBrand(name, "Generic"),
    image,
    images,
    price,
    rating: Number.isFinite(rating) ? rating : 4,
    reviews,
    buyLink: safeUrl,
    platform: "Amazon",
  });
}

async function scrapeMyntraProduct(url) {
  const { data } = await axios.get(url, {
    headers: REQUEST_HEADERS,
    timeout: 15000,
  });
  const html = String(data || "");
  const $ = cheerio.load(html);
  const rawName =
    normalizeWhitespace($("h1.pdp-title").first().text()) ||
    normalizeWhitespace($("h1").first().text());
  const subtitle = normalizeWhitespace($("h1.pdp-name").first().text());
  const name = cleanProductName(`${rawName} ${subtitle}`.trim());
  const priceText = $(".pdp-price").first().text();
  const price = Number(String(priceText).replace(/[^0-9]/g, ""));
  const image = absoluteUrl(
    "https://www.myntra.com",
    $("img").first().attr("src") || ""
  );
  const images = normalizeImageCollection(
    $("img")
      .map((_, element) => absoluteUrl("https://www.myntra.com", $(element).attr("src") || ""))
      .get()
      .slice(0, 8),
    image
  );
  const rating = parseFloat(
    String($(".index-overallRating").first().text()).replace(/[^0-9.]/g, "")
  );
  const reviews = extractReviews($, [
    {
      container: ".user-review-userReviewWrapper, .index-userContainer",
      text: ".user-review-reviewTextWrapper, .index-reviewText",
      rating: ".user-review-reviewStar, .index-userStarRating",
    },
  ]);

  return buildProductPayload({
    name,
    brand: extractBrand(name, "Generic"),
    image,
    images,
    price,
    rating: Number.isFinite(rating) ? rating : 4,
    reviews,
    buyLink: url,
    platform: "Myntra",
  });
}

async function scrapeFlipkartProduct(url) {
  async function tryPlaywrightScrape() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      locale: "en-US",
    });

    try {
      await page.setExtraHTTPHeaders({
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "accept-language": "en-US,en;q=0.9",
      });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForSelector("._30jeq3, .Nx9bqj.CxhGGd, span.VU-ZEz, span.B_NuCI", {
        timeout: 10000,
      });
      await page.waitForTimeout(1500);

      const product = await page.evaluate(() => {
        const text = (selector) =>
          (document.querySelector(selector)?.textContent || "").replace(/\s+/g, " ").trim();
        const attr = (selector, name) =>
          document.querySelector(selector)?.getAttribute(name) || "";
        const reviewNodes = Array.from(
          document.querySelectorAll("div.ZmyHeo, div._6K-7Co, div.col.EPCmJX")
        ).slice(0, 10);
        const reviews = reviewNodes
          .map((node) => ({
            text: (node.textContent || "").replace(/\s+/g, " ").trim(),
            rating: parseFloat(
              (((node.querySelector(".XQDdHH, ._3LWZlK")?.textContent || "").match(/[0-9.]+/)) || [0])[0]
            ) || 0,
          }))
          .filter((review) => review.text);

        return {
          rawName:
            text("span.VU-ZEz") ||
            text("span.B_NuCI") ||
            document.title,
          priceText:
            text(".Nx9bqj.CxhGGd") ||
            text("div._30jeq3") ||
            text("div._16Jk6d"),
          image: attr("img._396cs4, img._2r_T1I, img", "src"),
          images: Array.from(document.querySelectorAll("img"))
            .map((img) => img.getAttribute("src") || "")
            .filter(Boolean)
            .slice(0, 8),
          ratingText: text(".XQDdHH"),
          reviews,
        };
      });

      const name = cleanProductName(product.rawName);
      const price = Number(String(product.priceText).replace(/[^0-9]/g, ""));
      const image = absoluteUrl("https://www.flipkart.com", product.image || "");
      const images = normalizeImageCollection(
        (product.images || []).map((item) => absoluteUrl("https://www.flipkart.com", item)),
        image
      );
      const rating = parseFloat(String(product.ratingText).replace(/[^0-9.]/g, ""));

      if (!name || !Number.isFinite(price) || price <= 0) {
        return null;
      }

      return buildProductPayload({
        name,
        brand: extractBrand(name, "Generic"),
        image,
        images,
        price,
        rating: Number.isFinite(rating) ? rating : 4,
        reviews: Array.isArray(product.reviews) ? product.reviews : [],
        buyLink: url,
        platform: "Flipkart",
      });
    } finally {
      await page.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  }

  async function tryHtmlScrape() {
    const { data } = await axios.get(url, {
      headers: {
        ...REQUEST_HEADERS,
        Referer: "https://www.flipkart.com/",
      },
      timeout: 15000,
    });
    const html = String(data || "");
    const $ = cheerio.load(html);
    const rawName =
      normalizeWhitespace($("span.VU-ZEz").first().text()) ||
      normalizeWhitespace($("span.B_NuCI").first().text()) ||
      normalizeWhitespace($("title").first().text());
    const name = cleanProductName(rawName);
    const priceText =
      $(".Nx9bqj.CxhGGd").first().text() ||
      $("div._30jeq3").first().text() ||
      $("div._16Jk6d").first().text();
    const price = Number(String(priceText).replace(/[^0-9]/g, ""));
    const image = absoluteUrl("https://www.flipkart.com", $("img").first().attr("src") || "");
    const images = normalizeImageCollection(
      $("img")
        .map((_, element) => absoluteUrl("https://www.flipkart.com", $(element).attr("src") || ""))
        .get()
        .slice(0, 8),
      image
    );
    const rating = parseFloat(
      String($(".XQDdHH").first().text()).replace(/[^0-9.]/g, "")
    );
    const reviews = extractReviews($, [
      {
        container: "div.ZmyHeo, div._6K-7Co, div.col.EPCmJX",
        text: "div, p",
        rating: ".XQDdHH, ._3LWZlK",
      },
    ]);

    if (!name || !Number.isFinite(price) || price <= 0) {
      return null;
    }

    return buildProductPayload({
      name,
      brand: extractBrand(name, "Generic"),
      image,
      images,
      price,
      rating: Number.isFinite(rating) ? rating : 4,
      reviews,
      buyLink: url,
      platform: "Flipkart",
    });
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const browserResult = await tryPlaywrightScrape();
      if (browserResult?.name) {
        return browserResult;
      }
    } catch (error) {
      console.error(`Flipkart analyze Playwright attempt ${attempt} failed:`, error.message);
    }
  }

  try {
    return await tryHtmlScrape();
  } catch (error) {
    console.error("Flipkart analyze fallback failed:", error.message);
    return null;
  }
}

async function scrapeAjioProduct(url) {
  const { data } = await axios.get(url, {
    headers: REQUEST_HEADERS,
    timeout: 15000,
  });
  const html = String(data || "");
  const $ = cheerio.load(html);
  const rawName =
    normalizeWhitespace($(".prod-name").first().text()) ||
    normalizeWhitespace($("title").first().text());
  const name = cleanProductName(rawName);
  const brandText = normalizeWhitespace($(".brand-name").first().text());
  const priceText =
    $(".prod-sp").first().text() ||
    $(".price strong").first().text();
  const price = Number(String(priceText).replace(/[^0-9]/g, ""));
  const image = absoluteUrl("https://assets.ajio.com", $("img").first().attr("src") || "");
  const images = normalizeImageCollection(
    $("img")
      .map((_, element) => absoluteUrl("https://assets.ajio.com", $(element).attr("src") || ""))
      .get()
      .slice(0, 8),
    image
  );
  const rating = parseFloat(
    String($(".rating").first().text()).replace(/[^0-9.]/g, "")
  );
  const reviews = extractReviews($, [
    {
      container: ".review-card, .review-container",
      text: "p, .review-text",
      rating: ".rating, .star-rating",
    },
  ]);

  return buildProductPayload({
    name,
    brand: brandText || "Ajio",
    image,
    images,
    price,
    rating: Number.isFinite(rating) ? rating : 4,
    reviews,
    buyLink: url,
    platform: "Ajio",
  });
}

async function analyzeProductUrl(url) {
  let finalUrl = String(url || "").trim();

  if (finalUrl.includes("amzn.in")) {
    finalUrl = await resolveUrl(finalUrl);
  }

  const platform = detectPlatform(finalUrl);

  if (platform === "amazon") {
    return scrapeAmazonProduct(finalUrl);
  }

  if (platform === "myntra") {
    return scrapeMyntraProduct(finalUrl);
  }

  if (platform === "flipkart") {
    return scrapeFlipkartProduct(finalUrl);
  }

  if (platform === "ajio") {
    return scrapeAjioProduct(finalUrl);
  }

  return null;
}

module.exports = {
  analyzeProductUrl,
  resolveUrl,
  scrapeAjioProduct,
  scrapeAmazonProduct,
  scrapeFlipkartProduct,
  scrapeMyntraProduct,
};
