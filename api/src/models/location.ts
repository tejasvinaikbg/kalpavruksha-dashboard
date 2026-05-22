import mongoose, { Schema, model, type InferSchemaType } from "mongoose";

const locationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export type LocationDocument = InferSchemaType<typeof locationSchema>;

export const LocationModel =
  mongoose.models.Location || model<LocationDocument>("Location", locationSchema);
