"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { clearAuthToken, getAuthToken } from "@/lib/auth";
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  AlertCircle,
  Calendar,
  PieChart
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";

const GET_DASHBOARD_METRICS = gql`
  query GetDashboardMetrics($date: String) {
    dashboardMetrics(date: $date) {
      date
      dailyTotal
      monthlyTotal
      cashRatio
      onlineRatio
      totalMiscellaneous
      totalDamagedStock
      totalInventoryValue
      topCart {
        cartId
        cartCode
        totalSales
        onlineAmount
        cashAmount
        miscellaneous
        damagedStock
        entriesCount
      }
      topEmployee {
        employeeId
        employeeName
        totalSales
        onlineAmount
        cashAmount
        miscellaneous
        entriesCount
        daysWorked
      }
    }
  }
`;

const GET_FISCAL_YEAR_METRICS = gql`
  query GetFiscalYearMetrics($year: String) {
    fiscalYearMetrics(year: $year) {
      year
      fiscalYearStart
      fiscalYearEnd
      totalSales
      totalOnline
      totalCash
      averageMonthly
      topMonth
      topMonthSales
      monthlySales {
        month
        sales
        onlineAmount
        cashAmount
        entries
      }
    }
  }
`;

const GET_DAILY_SALES_METRICS = gql`
  query GetDailySalesMetrics($fromDate: String, $toDate: String) {
    dailySalesMetrics(fromDate: $fromDate, toDate: $toDate) {
      date
      totalOnline
      totalCash
      totalAmount
      miscellaneous
      damagedStock
      entryCount
    }
  }
`;

const GET_CART_PERFORMANCE = gql`
  query GetCartPerformance($fromDate: String, $toDate: String) {
    cartPerformance(fromDate: $fromDate, toDate: $toDate) {
      cartId
      cartCode
      totalSales
      onlineAmount
      cashAmount
      miscellaneous
      damagedStock
      entriesCount
    }
  }
`;

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const formatFiscalMonthLabel = (value: string) => {
  if (!value) return "";
  const parts = value.split("-");
  return parts.length > 1 ? parts[1] : value;
};

const formatDailyDateLabel = (value: string) => {
  const parsedDate = new Date(value + "T00:00:00Z");
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short"
  });
};

function getCurrentFiscalYearStart() {
  const today = new Date();
  return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
}

export default function DashboardClientEnhanced() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [lastDaysRange, setLastDaysRange] = useState(30);

  // Calculate date range for last N days
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - lastDaysRange);
  const fromDateStr = fromDate.toISOString().split("T")[0];

  // Auth guard
  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
    }
  }, [router]);

  const currentFiscalYearStart = getCurrentFiscalYearStart();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dashboardData, loading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useQuery<any>(GET_DASHBOARD_METRICS, {
    variables: { date: today },
    errorPolicy: "all"
  });

  const { data: fiscalYearData, loading: fiscalYearLoading, error: fiscalYearError, refetch: refetchFiscalYear } = useQuery<any>(GET_FISCAL_YEAR_METRICS, {
    variables: { year: String(currentFiscalYearStart) },
    errorPolicy: "all"
  });

  const { data: dailySalesData, loading: dailySalesLoading, refetch: refetchDailySales } = useQuery<any>(GET_DAILY_SALES_METRICS, {
    variables: { fromDate: fromDateStr, toDate: today },
    errorPolicy: "all"
  });

  const { data: cartPerformanceData, loading: cartPerformanceLoading, refetch: refetchCartPerformance } = useQuery<any>(GET_CART_PERFORMANCE, {
    variables: { fromDate: fromDateStr, toDate: today },
    errorPolicy: "all"
  });

  const isApolloAuthenticationError = (error: unknown): boolean => {
    return (
      typeof error === "object" &&
      error !== null &&
      "graphQLErrors" in error &&
      Array.isArray((error as any).graphQLErrors) &&
      (error as any).graphQLErrors[0]?.extensions?.code === "UNAUTHENTICATED"
    );
  };

  // Error handling for auth
  useEffect(() => {
    if (dashboardError && isApolloAuthenticationError(dashboardError)) {
      clearAuthToken();
      router.replace("/login");
    }
  }, [dashboardError, router]);

  const metrics = dashboardData?.dashboardMetrics || {
    date: today,
    dailyTotal: 0,
    monthlyTotal: 0,
    cashRatio: 0,
    onlineRatio: 0,
    totalMiscellaneous: 0,
    totalDamagedStock: 0,
    totalInventoryValue: 0
  };

  const fiscalMetrics = fiscalYearData?.fiscalYearMetrics || null;
  const monthlySales = fiscalMetrics?.monthlySales || [];
  const fiscalChartData = monthlySales.map((item: any) => ({
    ...item,
    monthLabel: formatFiscalMonthLabel(item.month)
  }));

  const dailySales = dailySalesData?.dailySalesMetrics || [];
  const chartData = dailySales.map((d: any) => ({
    date: d.date,
    online: d.totalOnline,
    cash: d.totalCash,
    total: d.totalAmount
  }));

  const cartPerformance = cartPerformanceData?.cartPerformance || [];
  const topCarts = cartPerformance.slice(0, 5);

  const paymentMix = [
    { name: 'Online', value: Math.round(metrics.dailyTotal * metrics.onlineRatio) },
    { name: 'Cash', value: Math.round(metrics.dailyTotal * metrics.cashRatio) }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      refetchDashboard?.(),
      refetchFiscalYear?.(),
      refetchDailySales?.(),
      refetchCartPerformance?.()
    ]);
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-950">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-600">
            Real-time sales and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {dashboardLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm animate-pulse">
              <div className="h-4 w-24 bg-stone-200 rounded mb-3" />
              <div className="h-8 w-32 bg-stone-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Metrics Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Daily Sales */}
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-600">Today's Sales</p>
                  <p className="mt-2 text-2xl font-bold text-stone-950">
                    ₹{metrics.dailyTotal.toFixed(2)}
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    Online: ₹{(metrics.dailyTotal * metrics.onlineRatio).toFixed(0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-600" />
              </div>
            </div>

            {/* Monthly Sales */}
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-600">This Month</p>
                  <p className="mt-2 text-2xl font-bold text-stone-950">
                    ₹{metrics.monthlyTotal.toFixed(2)}
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    All transactions
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            {/* Fiscal Year (if available) */}
            {fiscalMetrics && (
              <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-600">Fiscal Year</p>
                    <p className="mt-2 text-2xl font-bold text-stone-950">
                      ₹{(fiscalMetrics.totalSales / 100000).toFixed(1)}L
                    </p>
                    <p className="mt-2 text-xs text-stone-500">
                      {fiscalMetrics.year}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            )}

            {/* Inventory */}
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-600">Inventory</p>
                  <p className="mt-2 text-2xl font-bold text-stone-950">
                    {metrics.totalInventoryValue}
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    Total items
                  </p>
                </div>
                <Package className="h-8 w-8 text-amber-600" />
              </div>
            </div>
          </div>

          {/* Alert for Damaged Stock */}
          {metrics.totalDamagedStock > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">
                    {metrics.totalDamagedStock} items marked as damaged
                  </p>
                  <p className="text-sm text-orange-800">
                    Review damaged stock and adjust inventory or write it off if needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fiscal Year Sales Bar Chart */}
          {!fiscalYearLoading && fiscalMetrics && monthlySales.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-stone-950">{fiscalMetrics.year} Sales by Month</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fiscalChartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${(value / 100000).toFixed(1)}L`} />
                  <Bar dataKey="sales" fill="#3b82f6" name="Total Sales" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-sm text-stone-600">Total Sales</p>
                  <p className="text-xl font-bold text-stone-950">₹{(fiscalMetrics.totalSales / 100000).toFixed(1)}L</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-stone-600">Average Monthly</p>
                  <p className="text-xl font-bold text-stone-950">₹{(fiscalMetrics.averageMonthly / 100000).toFixed(1)}L</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-stone-600">Top Month</p>
                  <p className="text-xl font-bold text-stone-950">{fiscalMetrics.topMonth}</p>
                </div>
              </div>
            </div>
          )}

          {/* Last 30 Days Sales Trend */}
          {!dailySalesLoading && chartData.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-stone-950">Last 30 Days Sales Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDailyDateLabel}
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${(value / 1000).toFixed(0)}K`} />
                  <Legend />
                  <Line type="monotone" dataKey="online" stroke="#3b82f6" name="Online" />
                  <Line type="monotone" dataKey="cash" stroke="#10b981" name="Cash" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Today's Payment Mix */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-stone-950">Payment Mix</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={paymentMix}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ₹${(value / 1000).toFixed(0)}K`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMix.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 Carts */}
            {!cartPerformanceLoading && topCarts.length > 0 && (
              <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-stone-950">Top 5 Carts (Last 30 Days)</h3>
                </div>
                <div className="space-y-3">
                  {topCarts.map((cart: any, idx: number) => (
                    <div key={cart.cartId} className="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-stone-600 bg-stone-100 px-2 py-1 rounded">#{idx + 1}</span>
                        <span className="font-medium text-stone-950">{cart.cartCode}</span>
                      </div>
                      <span className="text-sm font-semibold text-stone-950">₹{(cart.totalSales / 1000).toFixed(0)}K</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top Performers */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Top Cart */}
            {metrics.topCart && (
              <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-stone-950">Top Cart (Today)</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Code</span>
                    <span className="font-medium text-stone-950">{metrics.topCart.cartCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Sales</span>
                    <span className="font-medium text-stone-950">₹{metrics.topCart.totalSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Online</span>
                    <span className="font-medium text-stone-950">₹{metrics.topCart.onlineAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Cash</span>
                    <span className="font-medium text-stone-950">₹{metrics.topCart.cashAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Entries</span>
                    <span className="font-medium text-stone-950">{metrics.topCart.entriesCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Employee */}
            {metrics.topEmployee && (
              <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-stone-950">Top Employee (Today)</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-600">Name</span>
                    <span className="font-medium text-stone-950">{metrics.topEmployee.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Sales</span>
                    <span className="font-medium text-stone-950">₹{metrics.topEmployee.totalSales.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Online</span>
                    <span className="font-medium text-stone-950">₹{metrics.topEmployee.onlineAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Cash</span>
                    <span className="font-medium text-stone-950">₹{metrics.topEmployee.cashAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Entries</span>
                    <span className="font-medium text-stone-950">{metrics.topEmployee.entriesCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
