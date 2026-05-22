import { createSchema } from "graphql-yoga";
import { getDatabaseStatus } from "../config/database.js";
import { env } from "../config/env.js";
import {
  createToken,
  requireAdmin,
  type AuthUser,
  type GraphqlContext
} from "./context.js";
import { CartDayEntryModel } from "../models/cart-day-entry.js";
import { CartModel } from "../models/cart.js";
import { EmployeeModel } from "../models/employee.js";
import { LocationModel } from "../models/location.js";
import { AttendanceModel } from "../models/attendance.js";
import {
  InventoryItemModel,
  InventoryTransactionModel
} from "../models/inventory.js";
import { seedInitialData } from "../services/seed.js";
import {
  calculateCartEntry,
  type CartEntryNumbers
} from "../services/calculations.js";
import {
  generateDailyReport,
  generateMonthlyReport,
  type ReportFilters
} from "../services/report.js";
import {
  addToInventory,
  deductFromInventory,
  getAllInventoryItems,
  getInventoryTransactions,
  getAvailableStock
} from "../services/inventory.js";

type InventoryItemInput = {
  itemName: string;
  quantity: number;
};

type CartDayEntryInput = {
  cartId: string;
  employeeId: string;
  locationId: string;
  date: string;
  inventoryItems?: InventoryItemInput[];
} & CartEntryNumbers;

type CartInput = {
  code?: string | null;
  name: string;
};

type EmployeeInput = {
  name: string;
  phone?: string | null;
};

type LocationInput = {
  name: string;
};

type AttendanceInput = {
  employeeId: string;
  date: string;
  status: "present" | "absent";
  allowance: number;
};

type CartDayEntryFilters = {
  date?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  cartId?: string | null;
  employeeId?: string | null;
  locationId?: string | null;
};

type DailyReportFilters = {
  fromDate?: string | null;
  toDate?: string | null;
  cartId?: string | null;
  employeeId?: string | null;
  locationId?: string | null;
};

type MonthlyReportFilters = {
  yearMonth: string;
  cartId?: string | null;
  employeeId?: string | null;
  locationId?: string | null;
};

function toId(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "_id" in value &&
    value._id
  ) {
    return value._id.toString();
  }

  return String(value);
}

function toNamedView(document: any) {
  return {
    id: document._id.toString(),
    code: document.code ?? null,
    name: document.name,
    phone: document.phone ?? null,
    active: document.active
  };
}

function toAttendanceView(document: any) {
  return {
    id: document._id.toString(),
    employee: toNamedView(document.employee),
    date: document.date,
    status: document.status,
    allowance: document.allowance,
    source: document.source,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

function requireName(name: string, label: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }

  return trimmed;
}

function toCartDayEntryView(document: any) {
  return {
    id: document._id.toString(),
    cart: toNamedView(document.cart),
    employee: toNamedView(document.employee),
    location: toNamedView(document.location),
    date: document.date,
    openingStock: document.openingStock ?? 0,
    restock: document.restock ?? 0,
    damagedStock: document.damagedStock ?? 0,
    closingStock: document.closingStock ?? 0,

    normalOnlineQty: document.normalOnlineQty ?? 0,
    normalOnlinePrice: document.normalOnlinePrice ?? 0,

    addOnOnlineQty: document.addOnOnlineQty ?? 0,
    addOnOnlinePrice: document.addOnOnlinePrice ?? 0,

    discountedOnlineQty: document.discountedOnlineQty ?? 0,
    discountedOnlinePrice: document.discountedOnlinePrice ?? 0,

    normalCashQty: document.normalCashQty ?? 0,
    normalCashPrice: document.normalCashPrice ?? 0,

    addOnCashQty: document.addOnCashQty ?? 0,
    addOnCashPrice: document.addOnCashPrice ?? 0,

    discountedCashQty: document.discountedCashQty ?? 0,
    discountedCashPrice: document.discountedCashPrice ?? 0,

    miscellaneousAmount: document.miscellaneousAmount ?? 0,

    calculations: {
      availableStock: document.calculations?.availableStock ?? 0,
      totalSold: document.calculations?.totalSold ?? 0,
      expectedClosing: document.calculations?.expectedClosing ?? 0,

      normalOnlineAmount:
        document.calculations?.normalOnlineAmount ?? 0,

      addOnOnlineAmount:
        document.calculations?.addOnOnlineAmount ?? 0,

      discountedOnlineAmount:
        document.calculations?.discountedOnlineAmount ?? 0,

      totalOnlineAmount:
        document.calculations?.totalOnlineAmount ?? 0,

      normalCashAmount:
        document.calculations?.normalCashAmount ?? 0,

      addOnCashAmount:
        document.calculations?.addOnCashAmount ?? 0,

      discountedCashAmount:
        document.calculations?.discountedCashAmount ?? 0,

      totalCashAmount:
        document.calculations?.totalCashAmount ?? 0,

      totalAmount:
        document.calculations?.totalAmount ?? 0,

      hasMismatch:
        document.calculations?.hasMismatch ?? false
    },
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}

async function validateCartDayEntryAssignment(
  date: string,
  employeeId: string,
  locationId: string,
  excludeId?: string
) {
  const employeeConflict = await CartDayEntryModel.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    employee: employeeId,
    date
  });

  if (employeeConflict) {
    throw new Error(
      `Employee is already assigned to another cart on ${date}`
    );
  }

  const locationConflict = await CartDayEntryModel.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    location: locationId,
    date
  });

  if (locationConflict) {
    throw new Error(
      `Location is already used by another cart on ${date}`
    );
  }
}

function normalizeEntryInput(input: CartDayEntryInput) {
  const numbers: CartEntryNumbers = {
    openingStock: Number(input.openingStock),
    restock: Number(input.restock),
    damagedStock: Number(input.damagedStock),
    normalOnlineQty: Number(input.normalOnlineQty),
    normalOnlinePrice: Number(input.normalOnlinePrice),
    addOnOnlineQty: Number(input.addOnOnlineQty),
    addOnOnlinePrice: Number(input.addOnOnlinePrice),
    discountedOnlineQty: Number(input.discountedOnlineQty),
    discountedOnlinePrice: Number(input.discountedOnlinePrice),
    normalCashQty: Number(input.normalCashQty),
    normalCashPrice: Number(input.normalCashPrice),
    addOnCashQty: Number(input.addOnCashQty),
    addOnCashPrice: Number(input.addOnCashPrice),
    discountedCashQty: Number(input.discountedCashQty),
    discountedCashPrice: Number(input.discountedCashPrice),
    miscellaneousAmount: Number(input.miscellaneousAmount)
  };

  const invalidNumber = Object.values(numbers).some(
    (value) => Number.isNaN(value) || value < 0
  );

  if (invalidNumber) {
    throw new Error("Entry numbers must be zero or greater");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("Date must use YYYY-MM-DD format");
  }

  const calculations = calculateCartEntry(numbers);
  if (calculations.expectedClosing < 0) {
    throw new Error("Closing stock cannot be negative");
  }

  return {
    cart: input.cartId,
    employee: input.employeeId,
    location: input.locationId,
    date: input.date,
    ...numbers,
    closingStock: calculations.expectedClosing,
    calculations
  };
}

async function markEmployeePresent(employeeId: string, date: string) {
  await AttendanceModel.updateOne(
    { employee: employeeId, date },
    {
      $set: {
        employee: employeeId,
        date,
        status: "present",
        source: "cart-entry"
      }
    },
    { upsert: true }
  );
}

export const schema = createSchema<GraphqlContext>({
  typeDefs: /* GraphQL */ `
    type User {
      username: String!
      role: String!
    }

    type AuthPayload {
      token: String!
      user: User!
    }

    type Cart {
      id: ID!
      code: String!
      name: String!
      active: Boolean!
    }

    type Employee {
      id: ID!
      name: String!
      phone: String
      active: Boolean!
    }

    type Location {
      id: ID!
      name: String!
      active: Boolean!
    }

    type Attendance {
      id: ID!
      employee: Employee!
      date: String!
      status: String!
      allowance: Float!
      source: String!
      createdAt: String!
      updatedAt: String!
    }

    type InventoryItem {
      id: ID!
      itemName: String!
      quantity: Int!
      availableStock: Int!
      active: Boolean!
      createdAt: String!
      updatedAt: String!
    }

    type InventoryTransaction {
      id: ID!
      itemName: String!
      date: String!
      quantity: Int!
      type: String!
      source: String!
      sourceReference: String
      notes: String
      requestedBy: String
      approvedBy: String
      approvalStatus: String!
      createdAt: String!
    }

    type CartEntryCalculations {
      availableStock: Int!
      totalSold: Int!
      expectedClosing: Int!
      normalOnlineAmount: Float!
      addOnOnlineAmount: Float!
      discountedOnlineAmount: Float!
      totalOnlineAmount: Float!
      normalCashAmount: Float!
      addOnCashAmount: Float!
      discountedCashAmount: Float!
      totalCashAmount: Float!
      totalAmount: Float!
      hasMismatch: Boolean!
    }

    type CartDayEntry {
      id: ID!
      cart: Cart!
      employee: Employee!
      location: Location!
      date: String!
      openingStock: Int!
      restock: Int!
      damagedStock: Int!
      closingStock: Int!
      normalOnlineQty: Int!
      normalOnlinePrice: Float!
      addOnOnlineQty: Int!
      addOnOnlinePrice: Float!
      discountedOnlineQty: Int!
      discountedOnlinePrice: Float!
      normalCashQty: Int!
      normalCashPrice: Float!
      addOnCashQty: Int!
      addOnCashPrice: Float!
      discountedCashQty: Int!
      discountedCashPrice: Float!
      miscellaneousAmount: Float!
      calculations: CartEntryCalculations!
      createdAt: String!
      updatedAt: String!
    }

    input InventoryItemInput {
      itemName: String!
      quantity: Int!
    }

    input CartDayEntryInput {
      cartId: ID!
      employeeId: ID!
      locationId: ID!
      date: String!
      openingStock: Int!
      restock: Int!
      damagedStock: Int!
      normalOnlineQty: Int!
      normalOnlinePrice: Float!
      addOnOnlineQty: Int!
      addOnOnlinePrice: Float!
      discountedOnlineQty: Int!
      discountedOnlinePrice: Float!
      normalCashQty: Int!
      normalCashPrice: Float!
      addOnCashQty: Int!
      addOnCashPrice: Float!
      discountedCashQty: Int!
      discountedCashPrice: Float!
      miscellaneousAmount: Float!
      inventoryItems: [InventoryItemInput!]
    }

    input CartInput {
      code: String
      name: String!
    }

    input EmployeeInput {
      name: String!
      phone: String
    }

    input LocationInput {
      name: String!
    }

    input AttendanceInput {
      employeeId: ID!
      date: String!
      status: String!
      allowance: Float!
    }

    input CartDayEntryFilters {
      date: String
      fromDate: String
      toDate: String
      cartId: ID
      employeeId: ID
      locationId: ID
    }

    input DailyReportFilters {
      fromDate: String
      toDate: String
      cartId: ID
      employeeId: ID
      locationId: ID
      damagedOnly: Boolean
    }

    input MonthlyReportFilters {
      yearMonth: String!
      cartId: ID
      employeeId: ID
      locationId: ID
      damagedOnly: Boolean
    }

    input AddToInventoryInput {
      itemName: String!
      quantity: Int!
      date: String!
      notes: String
    }

    enum InventoryDamageAction {
      DAMAGED
      WRITE_OFF
    }

    input DeductFromInventoryInput {
      itemName: String!
      quantity: Int!
      date: String!
      source: String
      sourceReference: String
      notes: String
    }

    input DamagedInventoryInput {
      itemName: String!
      quantity: Int!
      date: String!
      reason: String
      notes: String
      sourceReference: String
      actionType: InventoryDamageAction!
    }

    input InventoryTransactionFilters {
      fromDate: String
      toDate: String
      itemName: String
    }

    type ReportDownload {
      fileName: String!
      data: String!
    }

    type BootstrapResult {
      carts: Int!
      employees: Int!
      locations: Int!
    }

    type DailySalesMetric {
      date: String!
      totalOnline: Float!
      totalCash: Float!
      totalAmount: Float!
      miscellaneous: Float!
      damagedStock: Int!
      entryCount: Int!
    }

    type CartPerformanceMetric {
      cartId: ID!
      cartCode: String!
      totalSales: Float!
      onlineAmount: Float!
      cashAmount: Float!
      miscellaneous: Float!
      damagedStock: Int!
      entriesCount: Int!
    }

    type EmployeePerformanceMetric {
      employeeId: ID!
      employeeName: String!
      totalSales: Float!
      onlineAmount: Float!
      cashAmount: Float!
      miscellaneous: Float!
      entriesCount: Int!
      daysWorked: Int!
    }

    type InventoryBalanceMetric {
      itemName: String!
      currentQuantity: Int!
      totalAdded: Int!
      totalDeducted: Int!
      lastUpdated: String!
    }

    type MonthlySalesData {
      month: String!
      sales: Float!
      onlineAmount: Float!
      cashAmount: Float!
      entries: Int!
    }

    type FiscalYearMetrics {
      year: String!
      fiscalYearStart: String!
      fiscalYearEnd: String!
      totalSales: Float!
      totalOnline: Float!
      totalCash: Float!
      averageMonthly: Float!
      topMonth: String!
      topMonthSales: Float!
      monthlySales: [MonthlySalesData!]!
    }

    type DashboardMetrics {
      date: String!
      dailyTotal: Float!
      monthlyTotal: Float!
      cashRatio: Float!
      onlineRatio: Float!
      totalMiscellaneous: Float!
      totalDamagedStock: Int!
      totalInventoryValue: Int!
      topCart: CartPerformanceMetric
      topEmployee: EmployeePerformanceMetric
    }

    type Query {
      health: String!
      databaseStatus: String!
      me: User
      carts: [Cart!]!
      employees: [Employee!]!
      locations: [Location!]!
      attendance(date: String!): [Attendance!]!
      cartDayEntry(cartId: ID!, date: String!): CartDayEntry
      cartDayEntries(filters: CartDayEntryFilters): [CartDayEntry!]!
      inventoryItems: [InventoryItem!]!
      inventoryTransactions(filters: InventoryTransactionFilters): [InventoryTransaction!]!
      dashboardMetrics(date: String): DashboardMetrics!
      fiscalYearMetrics(year: String): FiscalYearMetrics!
      dailySalesMetrics(fromDate: String, toDate: String): [DailySalesMetric!]!
      cartPerformance(fromDate: String, toDate: String): [CartPerformanceMetric!]!
      employeePerformance(fromDate: String, toDate: String): [EmployeePerformanceMetric!]!
      inventoryBalance: [InventoryBalanceMetric!]!
      availableStock(itemName: String!): Int!
    }

    type Mutation {
      login(username: String!, password: String!): AuthPayload!
      bootstrapMasterData: BootstrapResult!
      createCart(input: CartInput!): Cart!
      updateCart(id: ID!, input: CartInput!): Cart!
      deleteCart(id: ID!): Cart!
      createEmployee(input: EmployeeInput!): Employee!
      updateEmployee(id: ID!, input: EmployeeInput!): Employee!
      deleteEmployee(id: ID!): Employee!
      createLocation(input: LocationInput!): Location!
      updateLocation(id: ID!, input: LocationInput!): Location!
      deleteLocation(id: ID!): Location!
      upsertAttendance(input: AttendanceInput!): Attendance!
      createCartDayEntry(input: CartDayEntryInput!): CartDayEntry!
      updateCartDayEntry(id: ID!, input: CartDayEntryInput!): CartDayEntry!
      addToInventory(input: AddToInventoryInput!): InventoryItem!
      deductFromInventory(input: DeductFromInventoryInput!): InventoryItem!
      reportDamagedStock(input: DamagedInventoryInput!): InventoryItem!
      generateDailyReport(filters: DailyReportFilters): ReportDownload!
      generateMonthlyReport(filters: MonthlyReportFilters!): ReportDownload!
    }
  `,
  resolvers: {
    Query: {
      health: () => "API healthy",
      databaseStatus: () => getDatabaseStatus(),
      me: (_parent, _args, context): AuthUser | null => context.user,
      carts: async (_parent, _args, context) => {
        requireAdmin(context);
        const carts = await CartModel.find({ active: true }).sort({ code: 1 });
        return carts.map(toNamedView);
      },
      employees: async (_parent, _args, context) => {
        requireAdmin(context);
        const employees = await EmployeeModel.find({ active: true }).sort({
          name: 1
        });
        return employees.map(toNamedView);
      },
      locations: async (_parent, _args, context) => {
        requireAdmin(context);
        const locations = await LocationModel.find({ active: true }).sort({
          name: 1
        });
        return locations.map(toNamedView);
      },
      attendance: async (
        _parent,
        args: { date: string },
        context
      ) => {
        requireAdmin(context);
        const records = await AttendanceModel.find({ date: args.date })
          .populate("employee")
          .sort({ employee: 1 });
        return records.map(toAttendanceView);
      },
      cartDayEntry: async (
        _parent,
        args: { cartId: string; date: string },
        context
      ) => {
        requireAdmin(context);
        const entry = await CartDayEntryModel.findOne({
          cart: args.cartId,
          date: args.date
        })
          .populate("cart")
          .populate("employee")
          .populate("location");

        return entry ? toCartDayEntryView(entry) : null;
      },
      cartDayEntries: async (
        _parent,
        args: { filters?: CartDayEntryFilters | null },
        context
      ) => {
        requireAdmin(context);
        const filters = args.filters ?? {};
        const query: Record<string, unknown> = {};

        if (filters.date) {
          query.date = filters.date;
        } else if (filters.fromDate || filters.toDate) {
          query.date = {
            ...(filters.fromDate ? { $gte: filters.fromDate } : {}),
            ...(filters.toDate ? { $lte: filters.toDate } : {})
          };
        }

        if (filters.cartId) {
          query.cart = filters.cartId;
        }
        if (filters.employeeId) {
          query.employee = filters.employeeId;
        }
        if (filters.locationId) {
          query.location = filters.locationId;
        }

        const entries = await CartDayEntryModel.find(query)
          .sort({ date: -1, cart: 1 })
          .populate("cart")
          .populate("employee")
          .populate("location");

        return entries.map(toCartDayEntryView);
      },
      inventoryItems: async (_parent, _args, context) => {
        requireAdmin(context);
        return await getAllInventoryItems();
      },
      inventoryTransactions: async (
        _parent,
        args: { filters?: any },
        context
      ) => {
        requireAdmin(context);
        const filters = args.filters ?? {};
        return await getInventoryTransactions(
          filters.fromDate,
          filters.toDate,
          filters.itemName
        );
      },
      dashboardMetrics: async (
        _parent,
        args: { date?: string },
        context
      ) => {
        requireAdmin(context);
        const queryDate = args.date || new Date().toISOString().split('T')[0];

        const todayEntries = await CartDayEntryModel.find({ date: queryDate })
          .populate("cart")
          .populate("employee");

        const monthStart = queryDate.substring(0, 7);
        const monthEntries = await CartDayEntryModel.find({
          date: { $gte: monthStart }
        });

        const todayStats = todayEntries.reduce(
          (acc, entry: any) => {
            const online = entry.calculations?.totalOnlineAmount || 0;
            const cash = entry.calculations?.totalCashAmount || 0;
            return {
              online: acc.online + online,
              cash: acc.cash + cash,
              misc: acc.misc + (entry.miscellaneousAmount || 0),
              damaged: acc.damaged + (entry.damagedStock || 0)
            };
          },
          { online: 0, cash: 0, misc: 0, damaged: 0 }
        );

        const monthStats = monthEntries.reduce(
          (acc: number, entry: any) => {
            const online = entry.calculations?.totalOnlineAmount || 0;
            const cash = entry.calculations?.totalCashAmount || 0;
            return acc + online + cash;
          },
          0
        );

        const dailyTotal = todayStats.online + todayStats.cash;
        const cashRatio = dailyTotal > 0 ? todayStats.cash / dailyTotal : 0;
        const onlineRatio = dailyTotal > 0 ? todayStats.online / dailyTotal : 0;
        const inventoryItems = await getAllInventoryItems();
        const totalInventoryValue = inventoryItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

        // Calculate top cart and employee from populated entries
        const cartMap: Record<string, any> = {};
        const empMap: Record<string, any> = {};

        todayEntries.forEach((entry: any) => {
          const online = entry.calculations?.totalOnlineAmount || 0;
          const cash = entry.calculations?.totalCashAmount || 0;

          const cartId = entry.cart._id.toString();
          if (!cartMap[cartId]) {
            cartMap[cartId] = { cart: entry.cart, total: 0, online: 0, cash: 0, misc: 0, damaged: 0, count: 0 };
          }
          cartMap[cartId].total += online + cash;
          cartMap[cartId].online += online;
          cartMap[cartId].cash += cash;
          cartMap[cartId].misc += entry.miscellaneousAmount || 0;
          cartMap[cartId].damaged += entry.damagedStock || 0;
          cartMap[cartId].count += 1;

          const empId = entry.employee._id.toString();
          if (!empMap[empId]) {
            empMap[empId] = { employee: entry.employee, total: 0, online: 0, cash: 0, misc: 0, count: 0 };
          }
          empMap[empId].total += online + cash;
          empMap[empId].online += online;
          empMap[empId].cash += cash;
          empMap[empId].misc += entry.miscellaneousAmount || 0;
          empMap[empId].count += 1;
        });

        const topCarts = Object.values(cartMap).sort((a: any, b: any) => b.total - a.total);
        const topEmps = Object.values(empMap).sort((a: any, b: any) => b.total - a.total);

        const topCart = topCarts[0] ? {
          cartId: topCarts[0].cart._id,
          cartCode: topCarts[0].cart.code || "",
          totalSales: topCarts[0].total,
          onlineAmount: topCarts[0].online,
          cashAmount: topCarts[0].cash,
          miscellaneous: topCarts[0].misc,
          damagedStock: topCarts[0].damaged,
          entriesCount: topCarts[0].count
        } : null;

        const topEmployee = topEmps[0] ? {
          employeeId: topEmps[0].employee._id,
          employeeName: topEmps[0].employee.name || "",
          totalSales: topEmps[0].total,
          onlineAmount: topEmps[0].online,
          cashAmount: topEmps[0].cash,
          miscellaneous: topEmps[0].misc,
          entriesCount: topEmps[0].count,
          daysWorked: 1
        } : null;

        return {
          date: queryDate,
          dailyTotal,
          monthlyTotal: monthStats,
          cashRatio,
          onlineRatio,
          totalMiscellaneous: todayStats.misc,
          totalDamagedStock: todayStats.damaged,
          totalInventoryValue,
          topCart,
          topEmployee
        };
      },
      fiscalYearMetrics: async (
        _parent,
        args: { year?: string },
        context
      ) => {
        requireAdmin(context);
        const today = new Date();
        const currentYear = today.getFullYear();

        // India fiscal year: April 1 to March 31
        // If it's April 1 or later, fiscal year starts in current year
        // If it's before April 1, fiscal year started in previous year
        let fiscalYearStart: number;
        if (today.getMonth() >= 3) { // April = 3 (0-indexed)
          fiscalYearStart = currentYear;
        } else {
          fiscalYearStart = currentYear - 1;
        }

        const queryYear = args.year ? parseInt(args.year) : fiscalYearStart;
        const startDate = `${queryYear}-04-01`;
        const endDate = `${queryYear + 1}-03-31`;

        // Fetch all entries for fiscal year
        const entries = await CartDayEntryModel.find({
          date: { $gte: startDate, $lte: endDate }
        }).lean();

        // Group by month
        const monthlyData: Record<string, any> = {};
        const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

        entries.forEach((entry: any) => {
          const dateObj = new Date(entry.date + 'T00:00:00Z');
          const month = dateObj.getMonth();
          const year = dateObj.getFullYear();

          // Calculate fiscal month (0-11, starting from April)
          let fiscalMonth: number;
          if (month >= 3) { // April to December
            fiscalMonth = month - 3;
          } else { // January to March
            fiscalMonth = month + 9;
          }

          const monthKey = `${fiscalMonth.toString().padStart(2, '0')}-${monthNames[fiscalMonth]}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              month: monthKey,
              sales: 0,
              onlineAmount: 0,
              cashAmount: 0,
              entries: 0
            };
          }

          const online = entry.calculations?.totalOnlineAmount || 0;
          const cash = entry.calculations?.totalCashAmount || 0;
          monthlyData[monthKey].sales += online + cash;
          monthlyData[monthKey].onlineAmount += online;
          monthlyData[monthKey].cashAmount += cash;
          monthlyData[monthKey].entries += 1;
        });

        // Convert to sorted array
        const monthlySales = Object.values(monthlyData) as any[];
        monthlySales.sort((a, b) => a.month.localeCompare(b.month));

        // Calculate totals
        const totalSales = monthlySales.reduce((sum, m) => sum + m.sales, 0);
        const totalOnline = monthlySales.reduce((sum, m) => sum + m.onlineAmount, 0);
        const totalCash = monthlySales.reduce((sum, m) => sum + m.cashAmount, 0);
        const averageMonthly = monthlySales.length > 0 ? totalSales / monthlySales.length : 0;

        // Find top month
        const topMonth = monthlySales.length > 0
          ? monthlySales.reduce((max, m) => m.sales > max.sales ? m : max)
          : null;

        return {
          year: `FY ${queryYear}-${queryYear + 1}`,
          fiscalYearStart: startDate,
          fiscalYearEnd: endDate,
          totalSales,
          totalOnline,
          totalCash,
          averageMonthly,
          topMonth: topMonth?.month || "",
          topMonthSales: topMonth?.sales || 0,
          monthlySales
        };
      },
      dailySalesMetrics: async (
        _parent,
        args: { fromDate?: string; toDate?: string },
        context
      ) => {
        requireAdmin(context);
        const today = new Date().toISOString().split('T')[0];
        const fromDate = args.fromDate || today;
        const toDate = args.toDate || today;

        const entries = await CartDayEntryModel.find({
          date: { $gte: fromDate, $lte: toDate }
        });

        const groupedByDate: Record<string, any> = {};
        entries.forEach((entry: any) => {
          const date = entry.date;
          if (!groupedByDate[date]) {
            groupedByDate[date] = {
              date,
              totalOnline: 0,
              totalCash: 0,
              totalAmount: 0,
              miscellaneous: 0,
              damagedStock: 0,
              entryCount: 0
            };
          }
          groupedByDate[date].totalOnline += entry.calculations?.totalOnlineAmount || 0;
          groupedByDate[date].totalCash += entry.calculations?.totalCashAmount || 0;
          groupedByDate[date].totalAmount += entry.calculations?.totalAmount || 0;
          groupedByDate[date].miscellaneous += entry.miscellaneousAmount || 0;
          groupedByDate[date].damagedStock += entry.damagedStock || 0;
          groupedByDate[date].entryCount += 1;
        });

        return Object.values(groupedByDate).sort((a: any, b: any) => a.date.localeCompare(b.date));
      },
      cartPerformance: async (
        _parent,
        args: { fromDate?: string; toDate?: string },
        context
      ) => {
        requireAdmin(context);
        const today = new Date().toISOString().split('T')[0];
        const fromDate = args.fromDate || today;
        const toDate = args.toDate || today;

        const cartStats = await CartDayEntryModel.aggregate([
          {
            $match: {
              date: { $gte: fromDate, $lte: toDate }
            }
          },
          {
            $group: {
              _id: "$cart",
              totalSales: { $sum: "$calculations.totalAmount" },
              onlineAmount: { $sum: "$calculations.totalOnlineAmount" },
              cashAmount: { $sum: "$calculations.totalCashAmount" },
              miscellaneous: { $sum: "$miscellaneousAmount" },
              damagedStock: { $sum: "$damagedStock" },
              entriesCount: { $sum: 1 }
            }
          }
        ]);

        const result = await Promise.all(
          cartStats.map(async (stat: any) => {
            const cart = await CartModel.findById(stat._id);
            return {
              cartId: stat._id,
              cartCode: cart?.code || "",
              totalSales: stat.totalSales || 0,
              onlineAmount: stat.onlineAmount || 0,
              cashAmount: stat.cashAmount || 0,
              miscellaneous: stat.miscellaneous || 0,
              damagedStock: stat.damagedStock || 0,
              entriesCount: stat.entriesCount || 0
            };
          })
        );

        return result.sort((a: any, b: any) => b.totalSales - a.totalSales);
      },
      employeePerformance: async (
        _parent,
        args: { fromDate?: string; toDate?: string },
        context
      ) => {
        requireAdmin(context);
        const today = new Date().toISOString().split('T')[0];
        const fromDate = args.fromDate || today;
        const toDate = args.toDate || today;

        const employeeStats = await CartDayEntryModel.aggregate([
          {
            $match: {
              date: { $gte: fromDate, $lte: toDate }
            }
          },
          {
            $group: {
              _id: "$employee",
              totalSales: { $sum: "$calculations.totalAmount" },
              onlineAmount: { $sum: "$calculations.totalOnlineAmount" },
              cashAmount: { $sum: "$calculations.totalCashAmount" },
              miscellaneous: { $sum: "$miscellaneousAmount" },
              entriesCount: { $sum: 1 },
              daysWorked: { $sum: 1 }
            }
          }
        ]);

        const result = await Promise.all(
          employeeStats.map(async (stat: any) => {
            const employee = await EmployeeModel.findById(stat._id);
            return {
              employeeId: stat._id,
              employeeName: employee?.name || "",
              totalSales: stat.totalSales || 0,
              onlineAmount: stat.onlineAmount || 0,
              cashAmount: stat.cashAmount || 0,
              miscellaneous: stat.miscellaneous || 0,
              entriesCount: stat.entriesCount || 0,
              daysWorked: stat.daysWorked || 0
            };
          })
        );

        return result.sort((a: any, b: any) => b.totalSales - a.totalSales);
      },
      inventoryBalance: async (
        _parent,
        _args,
        context
      ) => {
        requireAdmin(context);
        const items = await getAllInventoryItems();
        const transactions = await InventoryTransactionModel.find({}).sort({ date: -1 });

        return items.map((item: any) => {
          const itemTransactions = transactions.filter((t: any) => t.itemName === item.itemName);
          const added = itemTransactions.filter((t: any) => t.type === "ADD").reduce((sum: number, t: any) => sum + t.quantity, 0);
          const deducted = itemTransactions.filter((t: any) => t.type === "DEDUCT").reduce((sum: number, t: any) => sum + t.quantity, 0);

          return {
            itemName: item.itemName,
            currentQuantity: item.quantity,
            totalAdded: added,
            totalDeducted: deducted,
            lastUpdated: item.updatedAt
          };
        });
      },
      availableStock: async (_parent, args, context) => {
        requireAdmin(context);
        return await getAvailableStock(args.itemName);
      }
    },
    InventoryItem: {
      availableStock: (item: any) => item.quantity ?? 0
    },
    Mutation: {
      login: (_parent, args: { username: string; password: string }) => {
        if (
          args.username !== env.adminUsername ||
          args.password !== env.adminPassword
        ) {
          throw new Error("Invalid username or password");
        }

        const user: AuthUser = {
          username: env.adminUsername,
          role: "admin"
        };

        return {
          token: createToken(user),
          user
        };
      },
      bootstrapMasterData: async (_parent, _args, context) => {
        requireAdmin(context);
        await seedInitialData();

        const [carts, employees, locations] = await Promise.all([
          CartModel.countDocuments(),
          EmployeeModel.countDocuments(),
          LocationModel.countDocuments()
        ]);

        return {
          carts,
          employees,
          locations
        };
      },
      createCart: async (_parent, args: { input: CartInput }, context) => {
        requireAdmin(context);
        const name = requireName(args.input.name, "Cart name");
        const code =
          args.input.code?.trim() ||
          `CART-${Date.now().toString(36).toUpperCase()}`;
        const cart = await CartModel.create({ code, name, active: true });
        return toNamedView(cart);
      },
      updateCart: async (
        _parent,
        args: { id: string; input: CartInput },
        context
      ) => {
        requireAdmin(context);
        const update = {
          name: requireName(args.input.name, "Cart name"),
          ...(args.input.code?.trim() ? { code: args.input.code.trim() } : {})
        };
        const cart = await CartModel.findByIdAndUpdate(args.id, update, {
          new: true,
          runValidators: true
        });
        if (!cart) {
          throw new Error("Cart not found");
        }
        return toNamedView(cart);
      },
      deleteCart: async (_parent, args: { id: string }, context) => {
        requireAdmin(context);
        const cart = await CartModel.findByIdAndUpdate(
          args.id,
          { active: false },
          { new: true }
        );
        if (!cart) {
          throw new Error("Cart not found");
        }
        return toNamedView(cart);
      },
      createEmployee: async (
        _parent,
        args: { input: EmployeeInput },
        context
      ) => {
        requireAdmin(context);
        const employee = await EmployeeModel.create({
          name: requireName(args.input.name, "Employee name"),
          phone: args.input.phone?.trim() ?? "",
          active: true
        });
        return toNamedView(employee);
      },
      updateEmployee: async (
        _parent,
        args: { id: string; input: EmployeeInput },
        context
      ) => {
        requireAdmin(context);
        const employee = await EmployeeModel.findByIdAndUpdate(
          args.id,
          {
            name: requireName(args.input.name, "Employee name"),
            phone: args.input.phone?.trim() ?? ""
          },
          { new: true, runValidators: true }
        );
        if (!employee) {
          throw new Error("Employee not found");
        }
        return toNamedView(employee);
      },
      deleteEmployee: async (_parent, args: { id: string }, context) => {
        requireAdmin(context);
        const employee = await EmployeeModel.findByIdAndUpdate(
          args.id,
          { active: false },
          { new: true }
        );
        if (!employee) {
          throw new Error("Employee not found");
        }
        return toNamedView(employee);
      },
      createLocation: async (
        _parent,
        args: { input: LocationInput },
        context
      ) => {
        requireAdmin(context);
        const location = await LocationModel.create({
          name: requireName(args.input.name, "Location name"),
          active: true
        });
        return toNamedView(location);
      },
      updateLocation: async (
        _parent,
        args: { id: string; input: LocationInput },
        context
      ) => {
        requireAdmin(context);
        const location = await LocationModel.findByIdAndUpdate(
          args.id,
          { name: requireName(args.input.name, "Location name") },
          { new: true, runValidators: true }
        );
        if (!location) {
          throw new Error("Location not found");
        }
        return toNamedView(location);
      },
      deleteLocation: async (_parent, args: { id: string }, context) => {
        requireAdmin(context);
        const location = await LocationModel.findByIdAndUpdate(
          args.id,
          { active: false },
          { new: true }
        );
        if (!location) {
          throw new Error("Location not found");
        }
        return toNamedView(location);
      },
      upsertAttendance: async (
        _parent,
        args: { input: AttendanceInput },
        context
      ) => {
        requireAdmin(context);
        if (!["present", "absent"].includes(args.input.status)) {
          throw new Error("Attendance status must be present or absent");
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(args.input.date)) {
          throw new Error("Date must use YYYY-MM-DD format");
        }
        if (args.input.allowance < 0) {
          throw new Error("Allowance cannot be negative");
        }
        const record = await AttendanceModel.findOneAndUpdate(
          { employee: args.input.employeeId, date: args.input.date },
          {
            employee: args.input.employeeId,
            date: args.input.date,
            status: args.input.status,
            allowance: args.input.allowance,
            source: "manual"
          },
          { new: true, upsert: true, runValidators: true }
        ).populate("employee");

        return toAttendanceView(record);
      },
      createCartDayEntry: async (
        _parent,
        args: { input: CartDayEntryInput },
        context
      ) => {
        requireAdmin(context);
        const data = normalizeEntryInput(args.input);

        await validateCartDayEntryAssignment(
          args.input.date,
          args.input.employeeId,
          args.input.locationId
        );

        try {
          const entry = await CartDayEntryModel.create(data);
          await markEmployeePresent(args.input.employeeId, args.input.date);

          // Process inventory items if provided
          if (args.input.inventoryItems && args.input.inventoryItems.length > 0) {
            for (const item of args.input.inventoryItems) {
              await addToInventory(
                item.itemName,
                item.quantity,
                args.input.date,
                `CartEntry_${entry._id}`,
                `Added via cart entry for ${new Date(args.input.date).toLocaleDateString()}`
              );
            }
          }

          // Deduct restock sent to cart
          if (data.restock > 0) {
            await deductFromInventory(
              "Tender Coconut",
              data.restock,
              args.input.date,
              `CartRestock_${entry._id}`,
              "RESTOCK_SENT_OUT"
            ).catch(err => {
              console.warn("Failed to deduct restock from inventory:", err.message);
            });
          }

          const populated = await entry.populate(["cart", "employee", "location"]);
          return toCartDayEntryView(populated);
        } catch (error: any) {
          if (error?.code === 11000) {
            throw new Error("An entry already exists for this cart and date");
          }
          throw error;
        }
      },
      updateCartDayEntry: async (
        _parent,
        args: { id: string; input: CartDayEntryInput },
        context
      ) => {
        requireAdmin(context);
        const data = normalizeEntryInput(args.input);
        const previousEntry = await CartDayEntryModel.findById(args.id).lean();

        await validateCartDayEntryAssignment(
          args.input.date,
          args.input.employeeId,
          args.input.locationId,
          args.id
        );

        const existingSameDay = await CartDayEntryModel.findOne({
          _id: { $ne: args.id },
          cart: toId(data.cart),
          date: data.date
        });

        if (previousEntry) {
          const previousRestock = previousEntry.restock || 0;
          const restockDelta = data.restock - previousRestock;
          if (restockDelta > 0) {
            await deductFromInventory(
              "Tender Coconut",
              restockDelta,
              args.input.date,
              `CartRestock_${args.id}`,
              "RESTOCK_SENT_OUT"
            );
          } else if (restockDelta < 0) {
            await addToInventory(
              "Tender Coconut",
              -restockDelta,
              args.input.date,
              `CartRestock_${args.id}`,
              `Reversed restock adjustment for cart entry ${args.id}`
            );
          }
        }

        if (existingSameDay) {
          throw new Error("An entry already exists for this cart and date");
        }

        const entry = await CartDayEntryModel.findByIdAndUpdate(args.id, data, {
          new: true,
          runValidators: true
        })
          .populate("cart")
          .populate("employee")
          .populate("location");

        if (!entry) {
          throw new Error("Cart day entry not found");
        }

        await markEmployeePresent(args.input.employeeId, args.input.date);
        return toCartDayEntryView(entry);
      },
      generateDailyReport: async (
        _parent,
        args: { filters?: any },
        context
      ) => {
        requireAdmin(context);
        const filters: ReportFilters = {
          fromDate: args.filters?.fromDate,
          toDate: args.filters?.toDate,
          cartId: args.filters?.cartId,
          employeeId: args.filters?.employeeId,
          locationId: args.filters?.locationId,
          damagedOnly: args.filters?.damagedOnly
        };

        const buffer = await generateDailyReport(filters);
        const data = buffer.toString("base64");
        const fromDate = filters.fromDate?.replace(/-/g, "-") || "all";
        const toDate = filters.toDate?.replace(/-/g, "-") || "all";
        const fileName = `Daily-Report-${fromDate}-to-${toDate}.xlsx`;

        return { fileName, data };
      },
      generateMonthlyReport: async (
        _parent,
        args: { filters: any },
        context
      ) => {
        requireAdmin(context);
        const { yearMonth, cartId, employeeId, locationId, damagedOnly } = args.filters;

        if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
          throw new Error("yearMonth must be in YYYY-MM format");
        }

        const buffer = await generateMonthlyReport(yearMonth, {
          cartId,
          employeeId,
          locationId,
          damagedOnly
        });

        const data = buffer.toString("base64");
        const fileName = `Monthly-Report-${yearMonth}.xlsx`;

        return { fileName, data };
      },
      addToInventory: async (
        _parent,
        args: { input: any },
        context
      ) => {
        const user = requireAdmin(context);
        const { itemName, quantity, date, notes, sourceReference } = args.input;
        const item = await addToInventory(
          itemName,
          quantity,
          date,
          sourceReference,
          notes,
          user.username,
          "APPROVED"
        );
        return item;
      },
      deductFromInventory: async (
        _parent,
        args: { input: any },
        context
      ) => {
        const user = requireAdmin(context);
        const { itemName, quantity, date, source, notes, sourceReference } = args.input;
        const item = await deductFromInventory(
          itemName,
          quantity,
          date,
          sourceReference,
          source || "MANUAL_ADJUSTMENT",
          notes,
          user.username,
          "APPROVED"
        );
        return item;
      },
      reportDamagedStock: async (
        _parent,
        args: { input: any },
        context
      ) => {
        const user = requireAdmin(context);
        const { itemName, quantity, date, reason, notes, sourceReference, actionType } = args.input;
        const finalSource = actionType === "WRITE_OFF" ? "WRITE_OFF" : "DAMAGED";
        const transactionNotes = [reason?.trim(), notes?.trim()].filter(Boolean).join(" | ") || undefined;
        const item = await deductFromInventory(
          itemName,
          quantity,
          date,
          sourceReference,
          finalSource,
          transactionNotes,
          user.username,
          "APPROVED"
        );
        return item;
      }
    }
  }
});
