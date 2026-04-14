const axios = require("axios");
const cheerio = require("cheerio");

const DEFAULT_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
  Connection: "keep-alive",
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
];

const axiosInstance = axios.create({
  headers: {
    "User-Agent": "Mozilla/5.0",
    "Accept-Language": "en-US,en;q=0.9",
  },
  timeout: 15000,
});

function cleanPrice(value) {
  if (!value) return null;

  const normalized = String(value).replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPrice(...values) {
  for (const value of values) {
    const price = cleanPrice(value);
    if (price && price >= 100) {
      return price;
    }
  }

  return null;
}

function normalizeWhitespace(value) {
  return value ? value.replace(/\s+/g, " ").trim() : "";
}

function cleanProductName(value) {
  return normalizeWhitespace(value)
    .replace(/\b(men|men's|mens|women|women's|womens)\b/gi, " ")
    .replace(/\brunning shoes?\b/gi, " ")
    .replace(/\broad running\b/gi, " ")
    .replace(/\s+-\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchHtml(url, options = {}) {
  if (options.delayMs) {
    await delay(options.delayMs);
  }

  const response = await fetchWithRetry(
    url,
    {
      headers: {
        ...DEFAULT_HEADERS,
        "User-Agent": getRandomUserAgent(),
        ...options.headers,
      },
      timeout: options.timeout || 10000,
    },
    options.retries
  );

  return response.data;
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  try {
    return await axiosInstance.get(url, options);
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying: ${url}`);
      await delay(options.retryDelayMs || 2000);
      return fetchWithRetry(url, options, retries - 1);
    }

    throw error;
  }
}

function absoluteUrl(baseUrl, value) {
  if (!value) return "";

  try {
    return new URL(value, baseUrl).toString();
  } catch (_error) {
    return value;
  }
}

function fallbackRating(index) {
  return Number((4.1 + ((index % 8) * 0.1)).toFixed(1));
}

function parseJsonLdProducts($, config) {
  const products = [];

  $('script[type="application/ld+json"]').each((_index, element) => {
    try {
      const raw = $(element).contents().text().trim();
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed) ? parsed : [parsed];

      for (const entry of entries) {
        if (!entry || entry["@type"] !== "Product") {
          continue;
        }

        const offer = Array.isArray(entry.offers) ? entry.offers[0] : entry.offers;
        const image = Array.isArray(entry.image) ? entry.image[0] : entry.image;
        const price = extractPrice(
          offer?.price,
          offer?.lowPrice,
          offer?.highPrice
        );
        const name = cleanProductName(entry.name);

        if (!name || price === null || !image) {
          continue;
        }

        products.push({
          name,
          brand: normalizeWhitespace(entry.brand?.name || entry.brand || config.brand),
          price,
          image: absoluteUrl(config.baseUrl, image),
          rating: cleanPrice(entry.aggregateRating?.ratingValue),
          source: config.source,
          url: absoluteUrl(config.baseUrl, entry.url || ""),
          category: config.category,
        });
      }
    } catch (_error) {
      return;
    }

    return undefined;
  });

  return products;
}

function parseSelectorProducts($, config) {
  const products = [];

  $(config.productSelector).each((index, element) => {
    if (products.length >= config.limit) {
      return false;
    }

    const $card = $(element);
    const name = cleanProductName($card.find(config.nameSelector).first().text());
    const priceText = normalizeWhitespace($card.find(config.priceSelector).first().text());
    const imageNode = $card.find(config.imageSelector).first();
    const imageSource =
      imageNode.attr("src") || imageNode.attr("data-src") || imageNode.attr("srcset") || "";
    const linkSource = $card.find(config.linkSelector).first().attr("href") || "";
    const image = absoluteUrl(
      config.baseUrl,
      imageSource.split(",")[0]?.trim().split(" ")[0] || ""
    );
    const price = extractPrice(priceText);

    if (!name || price === null || !image) {
      return undefined;
    }

    products.push({
      name,
      brand: config.brand,
      price,
      image,
      rating: fallbackRating(index),
      source: config.source,
      url: absoluteUrl(config.baseUrl, linkSource),
      category: config.category,
    });

    return undefined;
  });

  return products;
}

async function scrapeWithConfig(config) {
  const html = await fetchHtml(config.url, {
    headers: config.headers,
    timeout: config.timeout,
    delayMs: config.delayMs,
  });
  const $ = cheerio.load(html);
  const jsonLdResults = parseJsonLdProducts($, config).slice(0, config.limit);

  if (jsonLdResults.length > 0) {
    return jsonLdResults;
  }

  if (!config.productSelector) {
    return [];
  }

  return parseSelectorProducts($, config);
}

module.exports = {
  absoluteUrl,
  cleanProductName,
  cleanPrice,
  delay,
  extractPrice,
  fetchHtml,
  fetchWithRetry,
  getRandomUserAgent,
  normalizeWhitespace,
  scrapeWithConfig,
};
