import ExcelJS from "exceljs";
import { CartDayEntryModel } from "../models/cart-day-entry.js";

export type ReportFilters = {
    fromDate?: string;
    toDate?: string;
    cartId?: string;
    employeeId?: string;
    locationId?: string;
    damagedOnly?: boolean;
};

export type CartEntryForReport = {
    date: string;
    cartCode: string;
    cartName: string;
    employeeName: string;
    locationName: string;
    openingStock: number;
    restock: number;
    damagedStock: number;
    closingStock: number;
    normalOnlineQty: number;
    normalOnlinePrice: number;
    addOnOnlineQty: number;
    addOnOnlinePrice: number;
    discountedOnlineQty: number;
    discountedOnlinePrice: number;
    normalCashQty: number;
    normalCashPrice: number;
    addOnCashQty: number;
    addOnCashPrice: number;
    discountedCashQty: number;
    discountedCashPrice: number;
    miscellaneousAmount: number;
    normalOnlineAmount: number;
    addOnOnlineAmount: number;
    discountedOnlineAmount: number;
    totalOnlineAmount: number;
    normalCashAmount: number;
    addOnCashAmount: number;
    discountedCashAmount: number;
    totalCashAmount: number;
    totalAmount: number;
};

async function fetchReportData(
    filters: ReportFilters
): Promise<CartEntryForReport[]> {
    const query: any = {};

    if (filters.fromDate || filters.toDate) {
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

    if (filters.damagedOnly) {
        query.damagedStock = { $gt: 0 };
    }

    const entries = await CartDayEntryModel.find(query)
        .sort({ date: -1, cart: 1 })
        .populate("cart")
        .populate("employee")
        .populate("location");

    return entries.map((entry: any) => ({
        date: entry.date,
        cartCode: entry.cart.code,
        cartName: entry.cart.name,
        employeeName: entry.employee.name,
        locationName: entry.location.name,

        openingStock: entry.openingStock,
        restock: entry.restock,
        damagedStock: entry.damagedStock,
        closingStock: entry.closingStock,

        normalOnlineQty: entry.normalOnlineQty,
        normalOnlinePrice: entry.normalOnlinePrice,

        addOnOnlineQty: entry.addOnOnlineQty,
        addOnOnlinePrice: entry.addOnOnlinePrice,

        discountedOnlineQty: entry.discountedOnlineQty,
        discountedOnlinePrice: entry.discountedOnlinePrice,

        normalCashQty: entry.normalCashQty,
        normalCashPrice: entry.normalCashPrice,

        addOnCashQty: entry.addOnCashQty,
        addOnCashPrice: entry.addOnCashPrice,

        discountedCashQty: entry.discountedCashQty,
        discountedCashPrice: entry.discountedCashPrice,


        miscellaneousAmount: entry.miscellaneousAmount,

        normalOnlineAmount: entry.calculations.normalOnlineAmount,
        addOnOnlineAmount: entry.calculations.addOnOnlineAmount,
        discountedOnlineAmount: entry.calculations.discountedOnlineAmount,
        totalOnlineAmount: entry.calculations.totalOnlineAmount,

        normalCashAmount: entry.calculations.normalCashAmount,
        addOnCashAmount: entry.calculations.addOnCashAmount,
        discountedCashAmount: entry.calculations.discountedCashAmount,
        totalCashAmount: entry.calculations.totalCashAmount,

        totalAmount: entry.calculations.totalAmount
    }));
}

function addHeaderRow(worksheet: ExcelJS.Worksheet): void {
    const headerRow = worksheet.addRow([
        "Date",
        "Cart",
        "Cart Name",
        "Employee",
        "Location",
        "Opening Stock",
        "Restock",
        "Damaged Stock",
        "Closing Stock",
        "Normal Online Qty",
        "Normal Online Price",
        "Add-on Online Qty",
        "Add-on Online Price",
        "Discounted Online Qty",
        "Discounted Online Price",
        "Total Online",
        "Normal Cash Qty",
        "Normal Cash Price",
        "Add-on Cash Qty",
        "Add-on Cash Price",
        "Discounted Cash Qty",
        "Discounted Cash Price",
        "Total Cash",
        "Miscellaneous",
        "Total Amount"
    ]);

    headerRow.font = {
        bold: true,
        color: { argb: "FFFFFFFF" }
    };

    headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF366092" }
    };

    headerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true
    };

    worksheet.columns = [
        { width: 12 },
        { width: 10 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 13 },
        { width: 10 },
        { width: 13 },
        { width: 13 },
        { width: 16 },
        { width: 16 },
        { width: 15 },
        { width: 15 },
        { width: 18 },
        { width: 18 },
        { width: 14 },
        { width: 13 },
        { width: 14 },
        { width: 14 },
        { width: 13 },
        { width: 13 },
        { width: 16 },
        { width: 16 },
        { width: 12 },
        { width: 12 },
        { width: 14 },
        { width: 13 }
    ];
}

function addDataRow(
    worksheet: ExcelJS.Worksheet,
    entry: CartEntryForReport
): void {
    worksheet.addRow([
        entry.date,
        entry.cartCode,
        entry.cartName,
        entry.employeeName,
        entry.locationName,

        entry.openingStock,
        entry.restock,
        entry.damagedStock,
        entry.closingStock,

        entry.normalOnlineQty,
        entry.normalOnlinePrice,

        entry.addOnOnlineQty,
        entry.addOnOnlinePrice,

        entry.discountedOnlineQty,
        entry.discountedOnlinePrice,

        entry.totalOnlineAmount,

        entry.normalCashQty,
        entry.normalCashPrice,

        entry.addOnCashQty,
        entry.addOnCashPrice,

        entry.discountedCashQty,
        entry.discountedCashPrice,

        entry.totalCashAmount,

        entry.miscellaneousAmount,
        entry.totalAmount
    ]);
}

function addTotalRow(
    worksheet: ExcelJS.Worksheet,
    data: CartEntryForReport[]
): void {
    const totalRow = worksheet.addRow([
        "TOTAL",
        "",
        "",
        "",
        "",

        data.reduce((sum, e) => sum + e.openingStock, 0),
        data.reduce((sum, e) => sum + e.restock, 0),
        data.reduce((sum, e) => sum + e.damagedStock, 0),
        data.reduce((sum, e) => sum + e.closingStock, 0),

        data.reduce((sum, e) => sum + e.normalOnlineQty, 0),
        data.reduce((sum, e) => sum + e.normalOnlineAmount, 0),

        data.reduce((sum, e) => sum + e.addOnOnlineQty, 0),
        data.reduce((sum, e) => sum + e.addOnOnlineAmount, 0),

        data.reduce((sum, e) => sum + e.discountedOnlineQty, 0),
        data.reduce((sum, e) => sum + e.discountedOnlineAmount, 0),
        data.reduce((sum, e) => sum + e.totalOnlineAmount, 0),

        data.reduce((sum, e) => sum + e.normalCashQty, 0),
        data.reduce((sum, e) => sum + e.normalCashAmount, 0),

        data.reduce((sum, e) => sum + e.addOnCashQty, 0),
        data.reduce((sum, e) => sum + e.addOnCashAmount, 0),

        data.reduce((sum, e) => sum + e.discountedCashQty, 0),
        data.reduce((sum, e) => sum + e.discountedCashAmount, 0),

        data.reduce((sum, e) => sum + e.totalCashAmount, 0),

        data.reduce((sum, e) => sum + e.miscellaneousAmount, 0),
        data.reduce((sum, e) => sum + e.totalAmount, 0)
    ]);

    totalRow.font = { bold: true };

    totalRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2EFDA" }
    };
}

function formatCurrencyColumns(worksheet: ExcelJS.Worksheet): void {
    const currencyColumns = [
        11, 13, 15, 16, 17,
        19, 21, 23, 24, 25,
        26, 27
    ];

    currencyColumns.forEach((columnIndex) => {
        worksheet.getColumn(columnIndex).numFmt = "₹#,##0.00";
    });
}

export async function generateDailyReport(
    filters: ReportFilters
): Promise<Buffer> {
    const data = await fetchReportData(filters);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Daily Report");

    addHeaderRow(worksheet);

    data.forEach((entry) => addDataRow(worksheet, entry));

    addTotalRow(worksheet, data);

    worksheet.views = [
        {
            state: "frozen",
            xSplit: 0,
            ySplit: 1
        }
    ];

    formatCurrencyColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer);
}

export async function generateMonthlyReport(
    yearMonth: string,
    filters: Omit<ReportFilters, "fromDate" | "toDate">
): Promise<Buffer> {
    const [year, month] = yearMonth.split("-");

    const fromDate = `${year}-${month}-01`;

    const lastDay = new Date(
        Number(year),
        Number(month),
        0
    ).getDate();

    const toDate = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    const data = await fetchReportData({
        ...filters,
        fromDate,
        toDate
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Monthly Report");

    addHeaderRow(worksheet);

    data.forEach((entry) => addDataRow(worksheet, entry));

    addTotalRow(worksheet, data);

    worksheet.views = [
        {
            state: "frozen",
            xSplit: 0,
            ySplit: 1
        }
    ];

    formatCurrencyColumns(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();

    return Buffer.from(buffer);
}