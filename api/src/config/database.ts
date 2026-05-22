import mongoose from "mongoose";
import { env } from "./env.js";
import { seedInitialData } from "../services/seed.js";

const stateLabels: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
  99: "uninitialized"
};

export function getDatabaseStatus() {
  return stateLabels[mongoose.connection.readyState] ?? "unknown";
}

export async function connectDatabase() {
  if (!env.mongoUri) {
    console.warn("MONGODB_URI is not set. Starting API without MongoDB.");
    return;
  }

  try {
    await mongoose.connect(env.mongoUri, {
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,
      // Timeout settings (in milliseconds)
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // Connection settings
      family: 4,
      retryWrites: true,
      w: "majority",
      // Add these for better performance
      connectTimeoutMS: 30000,
      // Avoid hanging connections
      waitQueueTimeoutMS: 10000
    });
    await seedInitialData();
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  }
}
