import mongoose, { Schema, model, type InferSchemaType } from "mongoose";

const attendanceSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      required: true
    },
    allowance: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    source: {
      type: String,
      enum: ["manual", "cart-entry"],
      default: "manual"
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export type AttendanceDocument = InferSchemaType<typeof attendanceSchema>;

export const AttendanceModel =
  mongoose.models.Attendance ||
  model<AttendanceDocument>("Attendance", attendanceSchema);
