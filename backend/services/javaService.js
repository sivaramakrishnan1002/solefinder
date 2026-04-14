const axios = require("axios");

const client = axios.create({
  baseURL: process.env.JAVA_SERVICE_URL || "http://localhost:8080",
  timeout: 5000,
});

async function getRecommendations(payload) {
  try {
    const response = await client.post("/api/recommend", payload);
    return response.data;
  } catch (error) {
    const serviceError = new Error(
      error.response?.data?.message ||
        "Unable to retrieve recommendations from the Java service"
    );
    serviceError.statusCode = error.response?.status || 502;
    throw serviceError;
  }
}

module.exports = {
  getRecommendations,
};
