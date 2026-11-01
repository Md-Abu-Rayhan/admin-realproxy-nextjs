"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import {
  DollarLineIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UserCircleIcon,
} from "@/icons";

interface AdjustmentItem {
  id: number;
  userId: number;
  email: string;
  proxyAccount: string | null;
  transactionType: string;
  action: "CREDIT" | "DEBIT";
  amountUsd: number;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod: string;
  status: string;
  description: string;
  adminUserId: number | null;
  adminEmail: string | null;
  createdAt: string;
}

interface AdjustmentMetrics {
  totalAddedUsd: number;
  totalDeductedUsd: number;
  netAdjustedUsd: number;
  totalTransactions: number;
  totalAddedCount: number;
  totalDeductedCount: number;
  uniqueUsersCount: number;
}

interface PaginatedAdjustmentsResponse {
  items: AdjustmentItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  metrics: AdjustmentMetrics;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WalletAdjustmentsPage() {
  const [data, setData] = useState<PaginatedAdjustmentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filters
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (action) params.set("action", action);
      if (search) params.set("search", search);

      const res = await apiFetch(`/api/Admin/wallet-adjustments?${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch adjustment logs");
      }
      const json: PaginatedAdjustmentsResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load balance adjustment logs.");
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, action, search]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setAction("");
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setEndDate(new Date().toISOString().split("T")[0]);
    setPage(1);
  };

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {/* Total Added (Credit) Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Balance Added</span>
            <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl dark:bg-emerald-500/10 dark:text-emerald-400">
              <ArrowUpIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? (
                <span className="animate-pulse text-gray-400 text-lg">Calculating...</span>
              ) : (
                `+$${(metrics?.totalAddedUsd ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {metrics?.totalAddedCount ?? 0} credit adjustment{metrics?.totalAddedCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Total Deducted (Debit) Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Balance Deducted</span>
            <div className="flex items-center justify-center w-12 h-12 bg-rose-50 text-rose-600 rounded-xl dark:bg-rose-500/10 dark:text-rose-400">
              <ArrowDownIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {loading ? (
                <span className="animate-pulse text-gray-400 text-lg">Calculating...</span>
              ) : (
                `-$${(metrics?.totalDeductedUsd ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {metrics?.totalDeductedCount ?? 0} debit adjustment{metrics?.totalDeductedCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Net Adjusted Balance Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Adjustment Impact</span>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-500/10 dark:text-blue-400">
              <DollarLineIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {loading ? (
                <span className="animate-pulse text-gray-400 text-lg">Calculating...</span>
              ) : (
                `$${(metrics?.netAdjustedUsd ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Net impact (Added − Deducted)
            </p>
          </div>
        </div>

        {/* Unique Users & Total Transactions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Impacted Users</span>
            <div className="flex items-center justify-center w-12 h-12 bg-purple-50 text-purple-600 rounded-xl dark:bg-purple-500/10 dark:text-purple-400">
              <UserCircleIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {loading ? (
                <span className="animate-pulse text-gray-400 text-lg">Calculating...</span>
              ) : (
                (metrics?.uniqueUsersCount ?? 0).toLocaleString()
              )}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Across {metrics?.totalTransactions ?? 0} total log entries
            </p>
          </div>
        </div>
      </div>

      {/* Header & Filter Controls */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="mb-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Balance Adjustment Logs
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {data
                ? `${data.totalCount} total adjustments recorded — Page ${data.page} of ${data.totalPages || 1}`
                : "Loading adjustment logs..."}
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-wrap gap-2.5 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Action Type
                </label>
                <select
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setPage(1);
                  }}
                  className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90"
                >
                  <option value="">All Adjustments</option>
                  <option value="CREDIT">Added (+ Credit)</option>
                  <option value="DEBIT">Deducted (- Debit)</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search email, proxy, reason, ID..."
                className="block w-full sm:w-72 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap shadow-sm transition"
              >
                Search
              </button>
              {(search || action || startDate !== thirtyDaysAgo.toISOString().split("T")[0]) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 whitespace-nowrap transition"
                >
                  Reset
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-white/[0.03] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/20">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  TX ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Target User
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Action
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Amount (USD)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Before
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  After
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Reason / Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Authorized By
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Date & Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading balance adjustment history...</span>
                    </div>
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    {search
                      ? `No balance adjustment records found matching "${search}".`
                      : "No balance adjustment records found for the selected criteria."}
                  </td>
                </tr>
              ) : (
                data?.items.map((item) => {
                  const isCredit = item.action === "CREDIT" || item.balanceAfter >= item.balanceBefore;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      {/* TX ID */}
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        #{item.id}
                      </td>

                      {/* Target User */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <Link
                            href={`/user-info?email=${encodeURIComponent(item.email)}`}
                            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {item.email}
                          </Link>
                          <span className="text-xs text-gray-400">
                            ID: #{item.userId}
                            {item.proxyAccount ? ` • ${item.proxyAccount}` : ""}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isCredit ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                            <ArrowUpIcon className="w-3 h-3" />
                            Added (Credit)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400">
                            <ArrowDownIcon className="w-3 h-3" />
                            Deducted (Debit)
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                        <span
                          className={
                            isCredit
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {isCredit ? "+" : "-"}${Number(item.amountUsd).toFixed(2)}
                        </span>
                      </td>

                      {/* Balance Before */}
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        ${Number(item.balanceBefore).toFixed(2)}
                      </td>

                      {/* Balance After */}
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-gray-800 dark:text-white/90 whitespace-nowrap">
                        ${Number(item.balanceAfter).toFixed(2)}
                      </td>

                      {/* Reason / Description */}
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 max-w-xs truncate" title={item.description}>
                        {item.description || "—"}
                      </td>

                      {/* Authorized By */}
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {item.adminEmail || (item.adminUserId ? `Admin #${item.adminUserId}` : "Admin")}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                          <CheckCircleIcon className="w-3 h-3" />
                          {item.status || "COMPLETED"}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(data.page - 1) * data.pageSize + 1}–
              {Math.min(data.page * data.pageSize, data.totalCount)} of {data.totalCount} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 px-2">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
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

