import {
    InventoryItemModel,
    InventoryTransactionModel
} from "../models/inventory.js";

export type InventoryOperation = {
    itemName: string;
    quantity: number;
    type: "ADD" | "DEDUCT";
    source: "ADDITION" | "MANUAL_ADJUSTMENT" | "RESTOCK_SENT_OUT" | "DAMAGED" | "WRITE_OFF";
    date: string;
    sourceReference?: string;
    notes?: string;
    requestedBy?: string;
    approvedBy?: string;
    approvalStatus?: "APPROVED" | "PENDING" | "REJECTED";
};

/**
 * Add or update an inventory item
 */
export async function upsertInventoryItem(
    itemName: string,
    quantityToAdd: number
) {
    const item = await InventoryItemModel.findOneAndUpdate(
        { itemName: itemName.trim() },
        {
            $inc: { quantity: quantityToAdd },
            itemName: itemName.trim()
        },
        { upsert: true, new: true }
    );
    return item;
}

/**
 * Record an inventory transaction
 */
export async function recordInventoryTransaction(
    operation: InventoryOperation
) {
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(operation.date)) {
        throw new Error("Inventory transaction date must use YYYY-MM-DD format");
    }

    if (Number.isNaN(new Date(operation.date).getTime())) {
        throw new Error("Inventory transaction date is invalid");
    }

    const sourceReference = operation.sourceReference?.trim();
    if (sourceReference) {
        const existingTransaction = await InventoryTransactionModel.findOne({ sourceReference });
        if (existingTransaction) {
            return existingTransaction;
        }
    }

    const transaction = await InventoryTransactionModel.create({
        itemName: operation.itemName.trim(),
        date: operation.date,
        quantity: operation.quantity,
        type: operation.type,
        source: operation.source,
        sourceReference,
        notes: operation.notes,
        requestedBy: operation.requestedBy,
        approvedBy: operation.approvedBy,
        approvalStatus: operation.approvalStatus ?? "APPROVED"
    });

    return transaction;
}

/**
 * Add items to inventory (create transaction and update quantity)
 */
export async function addToInventory(
    itemName: string,
    quantity: number,
    date: string,
    sourceReference?: string,
    notes?: string,
    requestedBy?: string,
    approvalStatus: "APPROVED" | "PENDING" | "REJECTED" = "APPROVED"
) {
    const trimmedSourceReference = sourceReference?.trim();
    if (trimmedSourceReference) {
        const existingTransaction = await InventoryTransactionModel.findOne({ sourceReference: trimmedSourceReference });
        if (existingTransaction) {
            return await InventoryItemModel.findOne({ itemName: itemName.trim() });
        }
    }
    // Validate
    if (!itemName.trim()) {
        throw new Error("Item name is required");
    }
    if (quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
    }
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
        throw new Error("Date must use YYYY-MM-DD format");
    }
    if (Number.isNaN(new Date(date).getTime())) {
        throw new Error("Date is invalid");
    }

    // Update inventory item quantity
    await upsertInventoryItem(itemName, quantity);

    // Record transaction
    await recordInventoryTransaction({
        itemName,
        quantity,
        type: "ADD",
        source: "ADDITION",
        date,
        sourceReference,
        notes,
        requestedBy,
        approvalStatus
    });

    return await InventoryItemModel.findOne({ itemName: itemName.trim() });
}

/**
 * Deduct items from inventory (for sent-out items)
 */
export async function deductFromInventory(
    itemName: string,
    quantity: number,
    date: string,
    sourceReference?: string,
    source: InventoryOperation["source"] = "MANUAL_ADJUSTMENT",
    notes?: string,
    requestedBy?: string,
    approvalStatus: "APPROVED" | "PENDING" | "REJECTED" = "APPROVED"
) {
    const trimmedSourceReference = sourceReference?.trim();
    if (trimmedSourceReference) {
        const existingTransaction = await InventoryTransactionModel.findOne({ sourceReference: trimmedSourceReference });
        if (existingTransaction) {
            return await InventoryItemModel.findOne({ itemName: itemName.trim() });
        }
    }

    // Validate
    if (!itemName.trim()) {
        throw new Error("Item name is required");
    }
    if (quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
    }
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
        throw new Error("Date must use YYYY-MM-DD format");
    }
    if (Number.isNaN(new Date(date).getTime())) {
        throw new Error("Date is invalid");
    }

    // Check if item exists and has enough quantity
    const item = await InventoryItemModel.findOne({ itemName: itemName.trim() });
    if (!item) {
        throw new Error(`Item "${itemName}" not found in inventory`);
    }
    if (item.quantity < quantity) {
        throw new Error(
            `Insufficient quantity for "${itemName}". Available: ${item.quantity}, Requested: ${quantity}`
        );
    }

    // Update inventory item quantity
    await InventoryItemModel.findOneAndUpdate(
        { itemName: itemName.trim() },
        { $inc: { quantity: -quantity } }
    );

    // Record transaction
    await recordInventoryTransaction({
        itemName,
        quantity,
        type: "DEDUCT",
        source,
        date,
        sourceReference: trimmedSourceReference,
        notes,
        requestedBy,
        approvalStatus
    });

    return await InventoryItemModel.findOne({ itemName: itemName.trim() });
}

/**
 * Get inventory item by name
 */
export async function getInventoryItem(itemName: string) {
    return await InventoryItemModel.findOne({
        itemName: itemName.trim()
    });
}

/**
 * Get all inventory items
 */
export async function getAllInventoryItems() {
    return await InventoryItemModel.find({ active: true }).sort({
        itemName: 1
    });
}

/**
 * Get inventory transactions for a date range
 */
export async function getInventoryTransactions(
    fromDate?: string,
    toDate?: string,
    itemName?: string
) {
    const query: any = {};

    if (fromDate || toDate) {
        query.date = {
            ...(fromDate ? { $gte: fromDate } : {}),
            ...(toDate ? { $lte: toDate } : {})
        };
    }

    if (itemName) {
        query.itemName = itemName.trim();
    }

    return await InventoryTransactionModel.find(query).sort({
        date: -1,
        createdAt: -1
    });
}

/**
 * Get available stock for an item
 */
export async function getAvailableStock(itemName: string) {
    return await InventoryItemModel.getAvailableStock(itemName);
}
