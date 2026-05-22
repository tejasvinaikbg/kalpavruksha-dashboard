import mongoose, { Schema, model, type InferSchemaType } from "mongoose";

const cartSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export type CartDocument = InferSchemaType<typeof cartSchema>;

export const CartModel =
  mongoose.models.Cart || model<CartDocument>("Cart", cartSchema);
