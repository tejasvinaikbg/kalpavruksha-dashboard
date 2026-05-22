import mongoose from "mongoose";
import { env } from "../config/env.js";
import { seedInitialData } from "../services/seed.js";
import { CartModel } from "../models/cart.js";
import { EmployeeModel } from "../models/employee.js";
import { LocationModel } from "../models/location.js";

if (!env.mongoUri) {
  console.error("MONGODB_URI is not set. Add it to api/.env first.");
  process.exit(1);
}

try {
  await mongoose.connect(env.mongoUri);
  await seedInitialData();

  const [carts, employees, locations] = await Promise.all([
    CartModel.countDocuments(),
    EmployeeModel.countDocuments(),
    LocationModel.countDocuments()
  ]);

  console.log("MongoDB connection successful");
  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Carts: ${carts}`);
  console.log(`Employees: ${employees}`);
  console.log(`Locations: ${locations}`);
} catch (error) {
  console.error("MongoDB connection failed");
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
