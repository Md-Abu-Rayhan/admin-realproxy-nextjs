"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { GroupIcon, DollarLineIcon, CheckCircleIcon, BoxIconLine } from "@/icons";

interface EpsPayment {
  id: number;
  email: string;
  proxyAccount: string | null;
  customerOrderId: string;
  merchantTransactionId: string;
  epsTransactionId: string | null;
  amount: number;
  status: string;
  paymentMethod: string | null;
  createdAt: string;
}

interface PaginatedResponse {
  items: EpsPayment[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Success: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
    Failed: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    Cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
    Expired: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorMap[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function EpsPaymentsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const [startDate, setStartDate] = useState(oneWeekAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (search) params.set("search", search);
      if (status) params.set("status", status);

      const res = await apiFetch(`/api/Admin/eps-payments?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: PaginatedResponse = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load EPS payments.");
    } finally {
      setLoading(false);
    }
  }, [page, search, startDate, endDate, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const [metrics, setMetrics] = useState<{
    totalUsers: number;
    totalAmountBdt: number;
    totalAmountUsd: number;
    successfulCount: number;
    successAmountBdt: number;
    successAmountUsd: number;
    totalCount: number;
  } | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const fetchRangeMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const baseParams = new URLSearchParams();
      if (startDate) baseParams.set("startDate", startDate);
      if (endDate) baseParams.set("endDate", endDate);
      if (search) baseParams.set("search", search);
      if (status) baseParams.set("status", status);

      // Fetch first chunk with pageSize=100
      const firstParams = new URLSearchParams(baseParams);
      firstParams.set("page", "1");
      firstParams.set("pageSize", "100");

      const firstRes = await apiFetch(`/api/Admin/eps-payments?${firstParams}`);
      if (!firstRes.ok) throw new Error("Failed to fetch range metrics");
      const firstJson: PaginatedResponse = await firstRes.json();

      let allItems = [...(firstJson.items || [])];
      const totalPages = firstJson.totalPages || 1;

      // If more pages exist, fetch remaining in parallel (up to 50 pages / 5,000 items)
      if (totalPages > 1) {
        const pagePromises = [];
        for (let p = 2; p <= Math.min(totalPages, 50); p++) {
          const pParams = new URLSearchParams(baseParams);
          pParams.set("page", String(p));
          pParams.set("pageSize", "100");
          pagePromises.push(
            apiFetch(`/api/Admin/eps-payments?${pParams}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((j) => j?.items || [])
              .catch(() => [])
          );
        }
        const remainingResults = await Promise.all(pagePromises);
        remainingResults.forEach((pageItems) => {
          allItems = allItems.concat(pageItems);
        });
      }

      const uniqueUserEmails = new Set(
        allItems.map((p) => p.email?.trim().toLowerCase()).filter(Boolean)
      );
      const totalAmountBdt = allItems.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      );
      const successfulPayments = allItems.filter((p) =>
        ["Success", "Completed", "Paid"].includes(p.status)
      );
      const successAmountBdt = successfulPayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      );

      setMetrics({
        totalUsers: uniqueUserEmails.size,
        totalAmountBdt,
        totalAmountUsd: totalAmountBdt / 125,
        successfulCount: successfulPayments.length,
        successAmountBdt,
        successAmountUsd: successAmountBdt / 125,
        totalCount: firstJson.totalCount ?? allItems.length,
      });
    } catch (err) {
      console.error("Error fetching all range metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  }, [startDate, endDate, search, status]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchRangeMetrics();
  }, [fetchRangeMetrics]);

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {/* Total Users Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</span>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-500/10 dark:text-blue-400">
              <GroupIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {metricsLoading ? (
                <span className="animate-pulse text-gray-400">Calculating...</span>
              ) : (
                (metrics?.totalUsers ?? 0).toLocaleString()
              )}
            </h3>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Unique accounts across date range
            </p>
          </div>
        </div>

        {/* Total Amount Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</span>
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl dark:bg-emerald-500/10 dark:text-emerald-400">
              <DollarLineIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {metricsLoading ? (
                <span className="animate-pulse text-gray-400">Calculating...</span>
              ) : (
                `৳${(metrics?.totalAmountBdt ?? 0).toLocaleString()}`
              )}
            </h3>
            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              ≈ ${(metrics?.totalAmountUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD (All pages)
            </p>
          </div>
        </div>

        {/* Completed Amount Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Volume</span>
            <div className="flex items-center justify-center w-12 h-12 bg-purple-50 text-purple-600 rounded-xl dark:bg-purple-500/10 dark:text-purple-400">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {metricsLoading ? (
                <span className="animate-pulse text-gray-400">Calculating...</span>
              ) : (
                `৳${(metrics?.successAmountBdt ?? 0).toLocaleString()}`
              )}
            </h3>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {metrics?.successfulCount ?? 0} successful txns in range
            </p>
          </div>
        </div>

        {/* Total Payments Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Payments</span>
            <div className="flex items-center justify-center w-12 h-12 bg-amber-50 text-amber-600 rounded-xl dark:bg-amber-500/10 dark:text-amber-400">
              <BoxIconLine className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {metricsLoading ? (
                <span className="animate-pulse text-gray-400">Calculating...</span>
              ) : (
                (metrics?.totalCount ?? 0).toLocaleString()
              )}
            </h3>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Total transactions in date range
            </p>
          </div>
        </div>
      </div>
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="mb-1 text-2xl font-semibold text-gray-800 dark:text-white/90">EPS Payments</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data ? `${data.totalCount} total payments — Page ${data.page} of ${data.totalPages}` : "Loading..."}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="date-filter-input block w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="date-filter-input block w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="block w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90"
                >
                  <option value="">All</option>
                  <option value="Success">Success</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search email, proxy, merchant ID..."
                className="block w-full sm:w-72 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
              >
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Proxy</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Merchant ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">EpsTrxId</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">Loading...</td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    {search ? `No payments matching "${search}".` : "No payments found for the selected date range."}
                  </td>
                </tr>
              ) : (
                data?.items.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800 dark:text-white/90">{p.email}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                      {p.proxyAccount ? (
                        <span className="font-mono text-xs">{p.proxyAccount}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-200">{p.merchantTransactionId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-200">{p.customerOrderId}</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.epsTransactionId ? (
                        <span className="font-mono text-xs text-gray-700 dark:text-gray-200">{p.epsTransactionId}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                      ${(p.amount / 125).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.totalCount)} of {data.totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {(() => {
                  const pages: React.ReactNode[] = [];
                  const total = data.totalPages;
                  const current = data.page;
                  const start = Math.max(1, current - 2);
                  const end = Math.min(total, current + 2);

                  if (start > 1) {
                    pages.push(
                      <button key={1} onClick={() => setPage(1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">1</button>
                    );
                    if (start > 2) pages.push(<span key="dots1" className="px-1 text-gray-400">⋯</span>);
                  }

                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium ${
                          i === current
                            ? "bg-blue-600 text-white"
                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }

                  if (end < total) {
                    if (end < total - 1) pages.push(<span key="dots2" className="px-1 text-gray-400">⋯</span>);
                    pages.push(
                      <button key={total} onClick={() => setPage(total)} className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700">{total}</button>
                    );
                  }

                  return pages;
                })()}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
