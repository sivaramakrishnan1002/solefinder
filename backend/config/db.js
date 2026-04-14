const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed", error.message);
    throw error;
  }
}

module.exports = connectDB;
