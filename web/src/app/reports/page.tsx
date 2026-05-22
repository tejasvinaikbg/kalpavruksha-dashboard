"use client";

import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";

const MASTER_DATA_QUERY = gql`
  query MasterData {
    carts {
      id
      code
      name
    }
    employees {
      id
      name
    }
    locations {
      id
      name
    }
  }
`;

const GENERATE_DAILY_REPORT = gql`
  mutation GenerateDailyReport($filters: DailyReportFilters) {
    generateDailyReport(filters: $filters) {
      fileName
      data
    }
  }
`;

const GENERATE_MONTHLY_REPORT = gql`
  mutation GenerateMonthlyReport($filters: MonthlyReportFilters!) {
    generateMonthlyReport(filters: $filters) {
      fileName
      data
    }
  }
`;

type Option = {
    id: string;
    code?: string;
    name: string;
};

type ReportType = "daily" | "monthly";

export default function ReportsPage() {
    const [reportType, setReportType] = useState<ReportType>("daily");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [yearMonth, setYearMonth] = useState("");
    const [selectedCart, setSelectedCart] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("");
    const [damagedOnly, setDamagedOnly] = useState(false);

    const { data } = useQuery<{ carts: Option[]; employees: Option[]; locations: Option[] }>(MASTER_DATA_QUERY);
    const [generateDaily, dailyState] = useMutation<any>(GENERATE_DAILY_REPORT);
    const [generateMonthly, monthlyState] = useMutation<any>(GENERATE_MONTHLY_REPORT);

    const isLoading = dailyState.loading || monthlyState.loading;

    function downloadFile(fileName: string, base64Data: string) {
        const binary = atob(base64Data);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([array], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async function handleGenerateDailyReport() {
        if (reportType === "daily" && (!fromDate || !toDate)) {
            alert("Please select both from and to dates");
            return;
        }

        try {
            const result = await generateDaily({
                variables: {
                    filters: {
                        fromDate: fromDate || null,
                        toDate: toDate || null,
                        cartId: selectedCart || null,
                        employeeId: selectedEmployee || null,
                        locationId: selectedLocation || null,
                        damagedOnly: damagedOnly || null
                    }
                }
            });

            if (result.data?.generateDailyReport) {
                const { fileName, data } = result.data.generateDailyReport;
                downloadFile(fileName, data);
            }
        } catch (error) {
            alert(`Error generating report: ${error}`);
        }
    }

    async function handleGenerateMonthlyReport() {
        if (!yearMonth) {
            alert("Please select a month");
            return;
        }

        try {
            const result = await generateMonthly({
                variables: {
                    filters: {
                        yearMonth,
                        cartId: selectedCart || null,
                        employeeId: selectedEmployee || null,
                        locationId: selectedLocation || null,
                        damagedOnly: damagedOnly || null
                    }
                }
            });

            if (result.data?.generateMonthlyReport) {
                const { fileName, data } = result.data.generateMonthlyReport;
                downloadFile(fileName, data);
            }
        } catch (error) {
            alert(`Error generating report: ${error}`);
        }
    }

    return (
        <AdminShell>
            <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                        Reports
                    </p>
                    <h1 className="text-3xl font-bold text-stone-950">Export Data</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                        Generate daily or monthly reports with detailed sales data, stock movements,
                        and financial summaries.
                    </p>
                </div>

                <div className="space-y-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                    {/* Report Type Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-stone-900">Report Type</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="daily"
                                    checked={reportType === "daily"}
                                    onChange={(e) => setReportType(e.target.value as ReportType)}
                                    className="h-4 w-4 rounded border-stone-300"
                                />
                                <span className="text-sm text-stone-700">Daily Report</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    value="monthly"
                                    checked={reportType === "monthly"}
                                    onChange={(e) => setReportType(e.target.value as ReportType)}
                                    className="h-4 w-4 rounded border-stone-300"
                                />
                                <span className="text-sm text-stone-700">Monthly Report</span>
                            </label>
                        </div>
                    </div>

                    {/* Date Range (Daily) */}
                    {reportType === "daily" && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-stone-900">From Date</label>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-stone-900">To Date</label>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Year-Month (Monthly) */}
                    {reportType === "monthly" && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-stone-900">Year and Month</label>
                            <input
                                type="month"
                                value={yearMonth}
                                onChange={(e) => setYearMonth(e.target.value)}
                                className="block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                            />
                        </div>
                    )}

                    {/* Filters */}
                    <div className="border-t border-stone-200 pt-6 space-y-4">
                        <h3 className="text-sm font-medium text-stone-900">Filters (Optional)</h3>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-stone-900">Cart</label>
                                <select
                                    value={selectedCart}
                                    onChange={(e) => setSelectedCart(e.target.value)}
                                    className="block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                                >
                                    <option value="">All Carts</option>
                                    {data?.carts?.map((cart: Option) => (
                                        <option key={cart.id} value={cart.id}>
                                            {cart.code} - {cart.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-stone-900">Employee</label>
                                <select
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                    className="block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                                >
                                    <option value="">All Employees</option>
                                    {data?.employees?.map((emp: Option) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-stone-900">Location</label>
                                <select
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    className="block w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                                >
                                    <option value="">All Locations</option>
                                    {data?.locations?.map((loc: Option) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    checked={damagedOnly}
                                    onChange={(e) => setDamagedOnly(e.target.checked)}
                                    className="h-4 w-4 rounded border-stone-300 text-emerald-700"
                                />
                                <label className="text-sm text-stone-700">Only damaged stock entries</label>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex gap-3 border-t border-stone-200 pt-6">
                        <button
                            onClick={
                                reportType === "daily" ? handleGenerateDailyReport : handleGenerateMonthlyReport
                            }
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FileDown className="h-4 w-4" />
                                    Download {reportType === "daily" ? "Daily" : "Monthly"} Report
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-900">
                        <strong>Report Contents:</strong> Cart details, employee names, locations, stock movements,
                        sales by type (normal, add-on, discounted), payment methods (cash, online), discounts, and
                        total amounts with subtotals.
                    </p>
                </div>
            </section>
        </AdminShell>
    );
}
