import mongoose, { Schema, model, type InferSchemaType } from "mongoose";

const calculationSchema = new Schema(
  {
    availableStock: { type: Number, required: true },
    totalSold: { type: Number, required: true },
    expectedClosing: { type: Number, required: true },
    normalOnlineAmount: { type: Number, required: true },
    addOnOnlineAmount: { type: Number, required: true },
    totalOnlineAmount: { type: Number, required: true },
    normalCashAmount: { type: Number, required: true },
    addOnCashAmount: { type: Number, required: true },
    totalCashAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    hasMismatch: { type: Boolean, required: true }
  },
  { _id: false }
);

const inventoryItemSchema = new Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const cartDayEntrySchema = new Schema(
  {
    cart: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      required: true
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },
    location: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    openingStock: { type: Number, required: true, min: 0 },
    restock: { type: Number, required: true, min: 0 },
    damagedStock: { type: Number, required: true, min: 0 },
    closingStock: { type: Number, required: true, min: 0 },
    normalOnlineQty: { type: Number, required: true, min: 0 },
    normalOnlinePrice: { type: Number, required: true, min: 0 },
    addOnOnlineQty: { type: Number, required: true, min: 0 },
    addOnOnlinePrice: { type: Number, required: true, min: 0 },
    discountedOnlineQty: { type: Number, required: true, min: 0 },
    discountedOnlinePrice: { type: Number, required: true, min: 0 },
    normalCashQty: { type: Number, required: true, min: 0 },
    normalCashPrice: { type: Number, required: true, min: 0 },
    addOnCashQty: { type: Number, required: true, min: 0 },
    addOnCashPrice: { type: Number, required: true, min: 0 },
    discountedCashQty: { type: Number, required: true, min: 0 },
    discountedCashPrice: { type: Number, required: true, min: 0 },
    miscellaneousAmount: { type: Number, required: true, min: 0, default: 0 },
    inventoryItems: [inventoryItemSchema],
    calculations: {
      type: calculationSchema,
      required: true
    }
  },
  { timestamps: true }
);

cartDayEntrySchema.index({ cart: 1, date: 1 }, { unique: true });

export type CartDayEntryDocument = InferSchemaType<typeof cartDayEntrySchema>;

export const CartDayEntryModel =
  mongoose.models.CartDayEntry ||
  model<CartDayEntryDocument>("CartDayEntry", cartDayEntrySchema);
