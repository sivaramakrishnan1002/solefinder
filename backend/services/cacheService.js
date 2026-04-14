const DEFAULT_TTL_MS = 60 * 1000;

const cache = new Map();

function getCache(key) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCache(key, value, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });

  return value;
}

function clearCache(prefix = "") {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

module.exports = {
  clearCache,
  getCache,
  setCache,
};
