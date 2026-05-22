import mongoose, { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    role: {
      type: String,
      enum: ["admin"],
      default: "admin"
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel =
  mongoose.models.User || model<UserDocument>("User", userSchema);
