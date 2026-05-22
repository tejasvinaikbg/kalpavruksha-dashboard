import { CartModel } from "../models/cart.js";
import { EmployeeModel } from "../models/employee.js";
import { LocationModel } from "../models/location.js";
import { UserModel } from "../models/user.js";
import { env } from "../config/env.js";

export async function seedInitialData() {
  const cartCount = await CartModel.countDocuments();
  if (cartCount === 0) {
    await CartModel.insertMany(
      Array.from({ length: 8 }, (_value, index) => ({
        code: `CART-${index + 1}`,
        name: `Cart ${index + 1}`
      }))
    );
  }

  const employeeCount = await EmployeeModel.countDocuments();
  if (employeeCount === 0) {
    await EmployeeModel.insertMany([
      { name: "Ramesh" },
      { name: "Suresh" },
      { name: "Mahesh" }
    ]);
  }

  const locationCount = await LocationModel.countDocuments();
  if (locationCount === 0) {
    await LocationModel.insertMany([
      { name: "Main Road" },
      { name: "Market Area" },
      { name: "Temple Street" }
    ]);
  }

  await UserModel.updateOne(
    { username: env.adminUsername },
    {
      $setOnInsert: {
        username: env.adminUsername,
        role: "admin",
        active: true
      }
    },
    { upsert: true }
  );
}
