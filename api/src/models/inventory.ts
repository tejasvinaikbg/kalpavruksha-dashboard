import mongoose, { Schema, model, type InferSchemaType } from "mongoose";

// Tracks individual inventory items and their current quantities
const inventoryItemSchema = new Schema(
    {
        itemName: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        quantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        active: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Tracks daily inventory transactions (additions and deductions)
const inventoryTransactionSchema = new Schema(
    {
        itemName: {
            type: String,
            required: true,
            trim: true
        },
        date: {
            type: String,
            required: true,
            match: /^\d{4}-\d{2}-\d{2}$/
        },
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        type: {
            type: String,
            enum: ["ADD", "DEDUCT"],
            required: true
        },
        source: {
            type: String,
            enum: ["ADDITION", "MANUAL_ADJUSTMENT", "RESTOCK_SENT_OUT", "DAMAGED", "WRITE_OFF"],
            required: true
        },
        sourceReference: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true
        },
        requestedBy: {
            type: String,
            trim: true
        },
        approvedBy: {
            type: String,
            trim: true
        },
        approvalStatus: {
            type: String,
            enum: ["APPROVED", "PENDING", "REJECTED"],
            default: "APPROVED"
        }
    },
    { timestamps: true }
);

inventoryTransactionSchema.index({ itemName: 1, date: 1 });
inventoryTransactionSchema.index({ date: 1 });
inventoryTransactionSchema.index({ sourceReference: 1 }, { unique: true, sparse: true });

export type InventoryItemDocument = InferSchemaType<typeof inventoryItemSchema>;
export type InventoryTransactionDocument = InferSchemaType<
    typeof inventoryTransactionSchema
>;

interface InventoryItemModelType extends mongoose.Model<InventoryItemDocument> {
    getAvailableStock(itemName: string): Promise<number>;
}

export const InventoryItemModel =
    (mongoose.models.InventoryItem as InventoryItemModelType) ||
    model<InventoryItemDocument, InventoryItemModelType>(
        "InventoryItem",
        inventoryItemSchema
    );

export const InventoryTransactionModel =
    mongoose.models.InventoryTransaction ||
    model<InventoryTransactionDocument>(
        "InventoryTransaction",
        inventoryTransactionSchema
    );

inventoryItemSchema.statics.getAvailableStock = async function (itemName: string) {
    const item = await this.findOne({ itemName });
    return item ? item.quantity : 0;
};
