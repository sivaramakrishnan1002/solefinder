const WISHLIST_KEY = "solefinder:wishlist";
const COMPARE_KEY = "solefinder:compare";
const RECENT_KEY = "solefinder:recent";

function readList(key, fallback = []) {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function writeList(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getWishlistIds() {
  return readList(WISHLIST_KEY, []);
}

export function toggleWishlistId(productId) {
  const current = getWishlistIds();
  const next = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId];

  writeList(WISHLIST_KEY, next);
  return next;
}

export function getCompareIds(defaultIds = []) {
  const stored = readList(COMPARE_KEY, []);
  return stored.length > 0 ? stored : defaultIds;
}

export function setCompareIds(productIds) {
  writeList(COMPARE_KEY, productIds);
  return productIds;
}

export function getRecentProductIds() {
  return readList(RECENT_KEY, []);
}

export function pushRecentProductId(productId) {
  const next = [productId, ...getRecentProductIds().filter((id) => id !== productId)].slice(
    0,
    5
  );
  writeList(RECENT_KEY, next);
  return next;
}
