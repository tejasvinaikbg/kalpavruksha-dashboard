"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { clearAuthToken, getAuthToken } from "@/lib/auth";
import { Plus, Trash2, X, TrendingUp, TrendingDown, ShieldAlert } from "lucide-react";

const GET_INVENTORY_ITEMS = gql`
  query GetInventoryItems {
    inventoryItems {
      id
      itemName
      quantity
      availableStock
      active
      updatedAt
      createdAt
    }
  }
`;

const GET_INVENTORY_TRANSACTIONS = gql`
  query GetInventoryTransactions($filters: InventoryTransactionFilters) {
    inventoryTransactions(filters: $filters) {
      id
      itemName
      date
      quantity
      type
      source
      sourceReference
      notes
      createdAt
    }
  }
`;

const ADD_TO_INVENTORY = gql`
  mutation AddToInventory($input: AddToInventoryInput!) {
    addToInventory(input: $input) {
      id
      itemName
      quantity
      active
      updatedAt
    }
  }
`;

const DEDUCT_FROM_INVENTORY = gql`
  mutation DeductFromInventory($input: DeductFromInventoryInput!) {
    deductFromInventory(input: $input) {
      id
      itemName
      quantity
      active
      updatedAt
    }
  }
`;

const REPORT_DAMAGED_STOCK = gql`
  mutation ReportDamagedStock($input: DamagedInventoryInput!) {
    reportDamagedStock(input: $input) {
      id
      itemName
      quantity
      active
      updatedAt
    }
  }
`;

interface InventoryItem {
  id: string;
  itemName: string;
  quantity: number;
  availableStock: number;
  active: boolean;
  updatedAt: string;
  createdAt?: string;
}

interface InventoryTransaction {
  id: string;
  itemName: string;
  date: string;
  quantity: number;
  type: string;
  source: string;
  sourceReference?: string;
  notes?: string;
  createdAt: string;
}

export default function InventoryEnhanced() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeductForm, setShowDeductForm] = useState(false);
  const [showDamageForm, setShowDamageForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"stock" | "transactions">("stock");
  const [selectedItemForTransactions, setSelectedItemForTransactions] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [addForm, setAddForm] = useState({
    itemName: "",
    quantity: 0,
    date: new Date().toISOString().split("T")[0]
  });
  const [deductForm, setDeductForm] = useState({
    itemName: "",
    quantity: 0,
    date: new Date().toISOString().split("T")[0]
  });
  const [damageForm, setDamageForm] = useState({
    itemName: "",
    quantity: 0,
    date: new Date().toISOString().split("T")[0],
    actionType: "DAMAGED",
    reason: "",
    notes: ""
  });

  // Auth guard
  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
    }
  }, [router]);

  const { data, loading, refetch, error: queryError } = useQuery<{ inventoryItems: InventoryItem[] }>(GET_INVENTORY_ITEMS, {
    errorPolicy: "all",
    pollInterval: 30000
  });

  const { data: transactionsData, loading: transactionsLoading, refetch: refetchTransactions } = useQuery<{ inventoryTransactions: InventoryTransaction[] }>(
    GET_INVENTORY_TRANSACTIONS,
    {
      variables: {
        filters: {
          fromDate: transactionDate,
          toDate: transactionDate,
          itemName: selectedItemForTransactions || undefined
        }
      },
      errorPolicy: "all",
      pollInterval: 30000
    }
  );

  const isApolloAuthenticationError = (error: unknown): boolean => {
    return (
      typeof error === "object" &&
      error !== null &&
      "graphQLErrors" in error &&
      Array.isArray((error as any).graphQLErrors) &&
      (error as any).graphQLErrors[0]?.extensions?.code === "UNAUTHENTICATED"
    );
  };

  useEffect(() => {
    if (queryError && isApolloAuthenticationError(queryError)) {
      clearAuthToken();
      router.replace("/login");
    }
  }, [queryError, router]);

  const [addMutation, { loading: addLoading }] = useMutation<any>(ADD_TO_INVENTORY, {
    onCompleted: () => {
      setAddForm({ itemName: "", quantity: 0, date: new Date().toISOString().split("T")[0] });
      setShowAddForm(false);
      setError(null);
      refetch();
      refetchTransactions();
    },
    onError: (err: any) => {
      if (err?.graphQLErrors?.[0]?.extensions?.code === "UNAUTHENTICATED") {
        clearAuthToken();
        router.replace("/login");
      } else {
        setError(err.message || "Failed to add item");
      }
    },
    errorPolicy: "all"
  });

  const [deductMutation, { loading: deductLoading }] = useMutation<any>(DEDUCT_FROM_INVENTORY, {
    onCompleted: () => {
      setDeductForm({ itemName: "", quantity: 0, date: new Date().toISOString().split("T")[0] });
      setShowDeductForm(false);
      setError(null);
      refetch();
      refetchTransactions();
    },
    onError: (err: any) => {
      if (err?.graphQLErrors?.[0]?.extensions?.code === "UNAUTHENTICATED") {
        clearAuthToken();
        router.replace("/login");
      } else {
        setError(err.message || "Failed to deduct item");
      }
    },
    errorPolicy: "all"
  });

  const [reportDamagedMutation, { loading: damageLoading }] = useMutation<any>(REPORT_DAMAGED_STOCK, {
    onCompleted: () => {
      setDamageForm({
        itemName: "",
        quantity: 0,
        date: new Date().toISOString().split("T")[0],
        actionType: "DAMAGED",
        reason: "",
        notes: ""
      });
      setShowDamageForm(false);
      setError(null);
      refetch();
      refetchTransactions();
    },
    onError: (err: any) => {
      if (err?.graphQLErrors?.[0]?.extensions?.code === "UNAUTHENTICATED") {
        clearAuthToken();
        router.replace("/login");
      } else {
        setError(err.message || "Failed to report damaged stock");
      }
    },
    errorPolicy: "all"
  });

  const handleAddItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addForm.itemName.trim() || addForm.quantity <= 0) {
      setError("Item name and quantity required");
      return;
    }
    await addMutation({
      variables: {
        input: {
          itemName: addForm.itemName.trim(),
          quantity: addForm.quantity,
          date: addForm.date
        }
      }
    });
  };

  const handleDeductItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!deductForm.itemName.trim() || deductForm.quantity <= 0) {
      setError("Item name and quantity required");
      return;
    }
    await deductMutation({
      variables: {
        input: {
          itemName: deductForm.itemName.trim(),
          quantity: deductForm.quantity,
          date: deductForm.date
        }
      }
    });
  };

  const handleReportDamaged = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!damageForm.itemName.trim() || damageForm.quantity <= 0) {
      setError("Item name and quantity required");
      return;
    }
    await reportDamagedMutation({
      variables: {
        input: {
          itemName: damageForm.itemName.trim(),
          quantity: damageForm.quantity,
          date: damageForm.date,
          actionType: damageForm.actionType,
          reason: damageForm.reason || null,
          notes: damageForm.notes || null,
          sourceReference: `Damage_${damageForm.itemName.trim()}_${damageForm.date}`
        }
      }
    });
  };

  const items: InventoryItem[] = data?.inventoryItems ?? [];
  const transactions: InventoryTransaction[] = transactionsData?.inventoryTransactions ?? [];

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
  };

  const totalStock = items.reduce((sum, item) => sum + item.quantity, 0);
  const activeItemsCount = items.filter(item => item.active).length;

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-950">Inventory</h1>
          <p className="mt-1 text-sm text-stone-600">
            Track stock levels and daily inventory movements
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-md border border-red-300 bg-red-50 p-4 text-red-800">
          <X className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-linear-to-br from-emerald-50 to-white p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-600">Total Items Types</p>
            <p className="mt-2 text-3xl font-bold text-stone-950">{items.length}</p>
            <p className="mt-2 text-xs text-stone-500">tracked in inventory</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-linear-to-br from-blue-50 to-white p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-600">Available Stock</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{totalStock}</p>
            <p className="mt-2 text-xs text-stone-500">total units in stock</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-linear-to-br from-purple-50 to-white p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-600">Active Items</p>
            <p className="mt-2 text-3xl font-bold text-purple-700">{activeItemsCount}</p>
            <p className="mt-2 text-xs text-stone-500">items are active</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200">
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-4 py-2 font-medium text-sm transition ${activeTab === "stock"
            ? "border-b-2 border-emerald-600 text-emerald-700"
            : "text-stone-600 hover:text-stone-900"
            }`}
        >
          Available Stock
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 font-medium text-sm transition ${activeTab === "transactions"
            ? "border-b-2 border-emerald-600 text-emerald-700"
            : "text-stone-600 hover:text-stone-900"
            }`}
        >
          Daily Transactions
        </button>
      </div>

      {/* Stock Tab */}
      {activeTab === "stock" && (
        <>
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:bg-stone-300"
              disabled={addLoading}
            >
              <Plus className="h-4 w-4" />
              {showAddForm ? "Cancel" : "Add Item"}
            </button>
            <button
              onClick={() => setShowDeductForm(!showDeductForm)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-orange-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:bg-stone-300"
              disabled={deductLoading}
            >
              <Trash2 className="h-4 w-4" />
              {showDeductForm ? "Cancel" : "Deduct Item"}
            </button>
            <button
              onClick={() => setShowDamageForm(!showDamageForm)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:bg-stone-300"
              disabled={damageLoading}
            >
              <ShieldAlert className="h-4 w-4" />
              {showDamageForm ? "Cancel" : "Report Damage"}
            </button>
          </div>

          {/* Add Item Form */}
          {showAddForm && (
            <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Item Name</label>
                    <input
                      type="text"
                      value={addForm.itemName}
                      onChange={(e) => setAddForm({ ...addForm, itemName: e.target.value })}
                      placeholder="e.g., Tender Coconut"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={addForm.quantity}
                      onChange={(e) => setAddForm({ ...addForm, quantity: parseInt(e.target.value) || 0 })}
                      min="1"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Date</label>
                    <input
                      type="date"
                      value={addForm.date}
                      onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={addLoading}
                      className="w-full rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:bg-stone-300"
                    >
                      {addLoading ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Deduct Item Form */}
          {showDeductForm && (
            <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
              <form onSubmit={handleDeductItem} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Item Name</label>
                    <select
                      value={deductForm.itemName}
                      onChange={(e) => setDeductForm({ ...deductForm, itemName: e.target.value })}
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select item...</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.itemName}>
                          {item.itemName} ({item.quantity} available)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={deductForm.quantity}
                      onChange={(e) => setDeductForm({ ...deductForm, quantity: parseInt(e.target.value) || 0 })}
                      min="1"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Date</label>
                    <input
                      type="date"
                      value={deductForm.date}
                      onChange={(e) => setDeductForm({ ...deductForm, date: e.target.value })}
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={deductLoading || !deductForm.itemName}
                      className="w-full rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:bg-stone-300"
                    >
                      {deductLoading ? "Deducting..." : "Deduct"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {showDamageForm && (
            <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
              <form onSubmit={handleReportDamaged} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Item Name</label>
                    <select
                      value={damageForm.itemName}
                      onChange={(e) => setDamageForm({ ...damageForm, itemName: e.target.value })}
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select item...</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.itemName}>
                          {item.itemName} ({item.quantity} available)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={damageForm.quantity}
                      onChange={(e) => setDamageForm({ ...damageForm, quantity: parseInt(e.target.value) || 0 })}
                      min="1"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Date</label>
                    <input
                      type="date"
                      value={damageForm.date}
                      onChange={(e) => setDamageForm({ ...damageForm, date: e.target.value })}
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Action</label>
                    <select
                      value={damageForm.actionType}
                      onChange={(e) => setDamageForm({ ...damageForm, actionType: e.target.value })}
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    >
                      <option value="DAMAGED">Damaged</option>
                      <option value="WRITE_OFF">Write-off</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Reason</label>
                    <input
                      type="text"
                      value={damageForm.reason}
                      onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })}
                      placeholder="e.g., broken stock"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-1">Notes</label>
                    <input
                      type="text"
                      value={damageForm.notes}
                      onChange={(e) => setDamageForm({ ...damageForm, notes: e.target.value })}
                      placeholder="Optional additional details"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={damageLoading || !damageForm.itemName}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-stone-300"
                  >
                    {damageLoading ? "Submitting..." : "Report Damage"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Items Table */}
          {loading ? (
            <div className="rounded-md border border-stone-200 bg-white shadow-sm p-8 text-center text-stone-500">
              Loading inventory...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-md border border-stone-200 bg-white shadow-sm p-8 text-center text-stone-500">
              No inventory items yet. Add items to get started.
            </div>
          ) : (
            <div className="rounded-md border border-stone-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-stone-200 bg-stone-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-950">Item Name</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-stone-950">Available Stock</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-950">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-stone-950">Last Updated</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-stone-950">View History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4 text-sm font-medium text-stone-950">{item.itemName}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                          {item.availableStock} units
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${item.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-stone-100 text-stone-800"
                          }`}>
                          {item.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-500">
                        {formatDate(item.updatedAt) ?? formatDate(item.createdAt ?? "") ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedItemForTransactions(item.itemName);
                            setActiveTab("transactions");
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <>
          {/* Transaction Filters */}
          <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">Select Date</label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">Filter by Item</label>
                <select
                  value={selectedItemForTransactions || ""}
                  onChange={(e) => setSelectedItemForTransactions(e.target.value || null)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="">All Items</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.itemName}>
                      {item.itemName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => refetchTransactions()}
                  className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {transactionsLoading ? (
            <div className="rounded-md border border-stone-200 bg-white shadow-sm p-8 text-center text-stone-500">
              Loading transactions...
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="rounded-md border border-stone-200 bg-white shadow-sm p-8 text-center text-stone-500">
              No transactions found for {transactionDate}
              {selectedItemForTransactions && ` and ${selectedItemForTransactions}`}
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className={`rounded-lg border-l-4 p-4 ${transaction.type === "ADD"
                    ? "border-l-emerald-600 bg-emerald-50"
                    : "border-l-orange-600 bg-orange-50"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${transaction.type === "ADD"
                            ? "bg-emerald-200 text-emerald-900"
                            : "bg-orange-200 text-orange-900"
                            }`}
                        >
                          {transaction.type === "ADD" ? (
                            <>
                              <TrendingUp className="h-3 w-3" /> Added
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3" /> Deducted
                            </>
                          )}
                        </span>
                        <span className="text-sm font-semibold text-stone-950">{transaction.itemName}</span>
                        <span
                          className={`text-lg font-bold ${transaction.type === "ADD" ? "text-emerald-700" : "text-orange-700"
                            }`}
                        >
                          {transaction.type === "ADD" ? "+" : "-"}
                          {transaction.quantity}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-stone-600">
                        {transaction.source && (
                          <div>
                            <span className="font-medium">Source:</span>
                            <span className="ml-2">{transaction.source}</span>
                          </div>
                        )}
                        {transaction.sourceReference && (
                          <div>
                            <span className="font-medium">Reference:</span>
                            <span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded">
                              {transaction.sourceReference}
                            </span>
                          </div>
                        )}
                        {transaction.notes && (
                          <div>
                            <span className="font-medium">Notes:</span>
                            <span className="ml-2">{transaction.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4 text-xs text-stone-500">
                      <p>{formatDate(transaction.date) ?? new Date(transaction.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
