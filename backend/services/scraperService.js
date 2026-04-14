const axios = require("axios");
const cheerio = require("cheerio");

const SOURCE_URL = "https://www.saucony.com/en/mens-running-shoes/";
const MAX_RESULTS = 12;

function cleanPrice(value) {
  if (!value) return null;

  const normalized = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function fallbackRating(index) {
  return Number((4.2 + ((index % 7) * 0.1)).toFixed(1));
}

function fallbackPopularity(index) {
  return 72 + ((index * 7) % 24);
}

function pickImage($tile) {
  return (
    $tile.find(".main-image img").attr("src") ||
    $tile.find(".main-image img").attr("data-src") ||
    $tile.find("img").eq(1).attr("src") ||
    $tile.find("img").eq(1).attr("data-src") ||
    $tile.find("img").first().attr("src") ||
    ""
  );
}

function parseTile($tile, index) {
  const name =
    $tile.find(".product-name").text().replace(/\s+/g, " ").trim() || null;
  const priceText =
    $tile.find(".product-tile-content").text().match(/\$\s*[0-9,.]+/)?.[0] || "";
  const image = pickImage($tile).trim();

  if (!name || !image) {
    return null;
  }

  return {
    name,
    brand: "Saucony",
    category: "Running",
    price: cleanPrice(priceText) ?? 0,
    image,
    rating: fallbackRating(index),
    popularity: fallbackPopularity(index),
    colors: [],
    retailers: 1,
  };
}

async function scrapeShoes() {
  try {
    const response = await axios.get(SOURCE_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const shoes = [];

    $(".product-tile").each((index, element) => {
      if (shoes.length >= MAX_RESULTS) {
        return false;
      }

      const parsed = parseTile($(element), index);
      if (parsed) {
        shoes.push(parsed);
      }

      return undefined;
    });

    return shoes;
  } catch (error) {
    console.error("Failed to scrape shoe listings", error.message);
    throw new Error("Unable to scrape products from source");
  }
}

module.exports = {
  scrapeShoes,
};
