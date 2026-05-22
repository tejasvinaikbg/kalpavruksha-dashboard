import mongoose, { Schema, model, type InferSchemaType } from "mongoose";

const employeeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export type EmployeeDocument = InferSchemaType<typeof employeeSchema>;

export const EmployeeModel =
  mongoose.models.Employee || model<EmployeeDocument>("Employee", employeeSchema);
