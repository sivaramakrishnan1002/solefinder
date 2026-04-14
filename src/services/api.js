export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function request(path, options = {}, fallbackMessage = "Failed to load data") {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = fallbackMessage;

    try {
      const payload = await response.json();
      message =
        payload.message ||
        payload.error ||
        (payload.reason ? `${fallbackMessage}: ${payload.reason}` : message);
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json();
}

function unwrapApiPayload(payload) {
  if (payload && typeof payload === "object" && "success" in payload) {
    return payload.success ? payload.data : payload;
  }

  return payload;
}

export async function getProducts(params = {}) {
  const payload = await request(
    `/products${buildQueryString(params)}`,
    {},
    "Failed to fetch products"
  );
  const data = unwrapApiPayload(payload);
  const products = Array.isArray(data)
    ? data
    : Array.isArray(data?.products)
      ? data.products
      : Array.isArray(data?.data)
        ? data.data
        : [];

  return {
    products,
    total: Number(data?.total) || products.length,
    page: Number(data?.page) || 1,
    totalPages: Number(data?.totalPages) || 1,
  };
}

export async function filterProducts(payload = {}) {
  const responsePayload = await request(
    "/filter",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "Failed to filter products"
  );
  const data = unwrapApiPayload(responsePayload);

  const products = Array.isArray(data?.products)
    ? data.products
    : Array.isArray(data)
      ? data
      : [];

  return {
    products,
    total: Number(data?.total) || products.length,
    page: Number(data?.page) || 1,
    totalPages: Number(data?.totalPages) || 1,
    filters: data?.filters || {
      brands: [],
      categories: [],
      genders: [],
      maxPrice: 0,
    },
  };
}

export async function getProductById(id) {
  const payload = await request(`/products/${id}`, {}, "Failed to fetch product");
  return unwrapApiPayload(payload);
}

export async function getRecommendations(input) {
  const payload = await request(
    "/recommend",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    "Failed to fetch recommendations"
  );
  const data = unwrapApiPayload(payload);

  return Array.isArray(data) ? data : [];
}

export async function compareProducts(productIds = []) {
  const payload = await request(
    "/compare",
    {
      method: "POST",
      body: JSON.stringify({ product_ids: productIds }),
    },
    "Failed to compare products"
  );
  const data = unwrapApiPayload(payload);

  return {
    products: Array.isArray(data?.products) ? data.products : [],
    winner: data?.winner || null,
    metrics: data?.metrics || {},
  };
}

export async function searchProducts(query) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) {
    return [];
  }

  const payload = await request(
    `/products/search${buildQueryString({ q: trimmedQuery })}`,
    {},
    "Search failed"
  );
  const data = unwrapApiPayload(payload);

  return Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];
}

export async function getAiRecommendations(params = {}) {
  const payload = await request(
    `/ai/recommend${buildQueryString(params)}`,
    {},
    "Failed to fetch smart picks"
  );
  const data = unwrapApiPayload(payload);

  return Array.isArray(data) ? data : [];
}

export async function getSimilarProducts(id) {
  const payload = await request(`/ai/similar/${id}`, {}, "Failed to fetch similar products");
  const data = unwrapApiPayload(payload);
  return Array.isArray(data) ? data : [];
}

export async function getAiTopProducts() {
  const payload = await request("/ai/top", {}, "Failed to fetch top products");
  const data = unwrapApiPayload(payload);
  return Array.isArray(data) ? data : [];
}

export async function analyzeProductUrl(url) {
  const payload = await request(
    "/ai/analyze",
    {
      method: "POST",
      body: JSON.stringify({ url }),
    },
    "Failed to analyze product"
  );
  const data = unwrapApiPayload(payload);

  return data?.success && data?.data ? data.data : data;
}

export async function getPriceTrend(id) {
  const payload = await request(`/price-trend/${id}`, {}, "Failed to fetch price trend");
  const data = unwrapApiPayload(payload);
  return Array.isArray(data) ? data : [];
}

export async function trackProductEvent(id, type, metadata = {}) {
  const payload = await request(
    `/products/${id}/events`,
    {
      method: "POST",
      body: JSON.stringify({ type, metadata }),
    },
    "Failed to track product event"
  );

  return unwrapApiPayload(payload);
}
