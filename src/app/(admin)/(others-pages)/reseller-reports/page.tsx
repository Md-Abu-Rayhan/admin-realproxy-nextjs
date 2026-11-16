"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import {
  DollarLineIcon,
  CheckCircleIcon,
  UserCircleIcon,
  CopyIcon,
  CloseIcon,
  ArrowRightIcon,
  GroupIcon,
  BoxIcon,
} from "@/icons";

interface ResellerTransferItem {
  id: number;
  resellerUserId: number;
  resellerEmail: string;
  targetUserId: number;
  targetEmail: string;
  proxyType: string;
  bandwidthGb: number;
  bandwidthMb: number;
  ratePerGbUsd: number;
  totalCostUsd: number;
  totalCostBdt: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  clientIp: string | null;
  status: string;
  createdAt: string;
}

interface ResellerTransferMetrics {
  totalBandwidthGb: number;
  totalBandwidthMb: number;
  totalCostUsd: number;
  totalCostBdt: number;
  totalTransfers: number;
  uniqueResellersCount: number;
  uniqueClientsCount: number;
}

interface PaginatedTransfersResponse {
  items: ResellerTransferItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  metrics: ResellerTransferMetrics;
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

function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ResellerReportsPage() {
  const [data, setData] = useState<PaginatedTransfersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Default 1-Week Date Range (Pre-selected)
  const [startDate, setStartDate] = useState(() => getDaysAgo(7));
  const [endDate, setEndDate] = useState(() => getToday());
  const [activeDatePreset, setActiveDatePreset] = useState<"7d" | "14d" | "30d" | "all">("7d");

  const [proxyType, setProxyType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Modal State ("Dispatch Details" - Standard Centered Dialog Style)
  const [selectedItem, setSelectedItem] = useState<ResellerTransferItem | null>(null);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (proxyType && proxyType !== "ALL") params.set("proxyType", proxyType);
      if (search) params.set("search", search);

      const res = await apiFetch(`/api/Admin/reseller-transfers?${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch reseller transfers");
      }
      const json: PaginatedTransfersResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load reseller dispatch reports.");
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, proxyType, search]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedItem(null);
      }
    };
    if (selectedItem) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const applyPreset = (preset: "7d" | "14d" | "30d" | "all") => {
    setActiveDatePreset(preset);
    setPage(1);
    if (preset === "7d") {
      setStartDate(getDaysAgo(7));
      setEndDate(getToday());
    } else if (preset === "14d") {
      setStartDate(getDaysAgo(14));
      setEndDate(getToday());
    } else if (preset === "30d") {
      setStartDate(getDaysAgo(30));
      setEndDate(getToday());
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setProxyType("ALL");
    setStartDate(getDaysAgo(7));
    setEndDate(getToday());
    setActiveDatePreset("7d");
    setPage(1);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}!`);
  };

  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Reseller Dispatches & User Journey
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Comprehensive audit report of proxy bandwidth distributed by authorized resellers to client accounts.
          </p>
        </div>
        <button
          onClick={() => fetchTransfers()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 shadow-xs cursor-pointer"
        >
          {loading ? "Refreshing..." : "Refresh Report"}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {/* Total Bandwidth Dispatched */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Volume Dispatched</span>
            <div className="flex items-center justify-center w-11 h-11 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-500/10 dark:text-blue-400">
              <BoxIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              {loading ? (
                <span className="animate-pulse text-gray-400 text-lg">Calculating...</span>
              ) : (
                `${(metrics?.totalBandwidthGb ?? 0).toLocaleString()} GB`
              )}
            </h3>
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
              ≈ {((metrics?.totalBandwidthMb ?? 0)).toLocaleString()} MB proxy traffic
            </p>
          </div>
        </div>

        {/* Total Turnover / Cost */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Reseller Ledger Turnover</span>
            <div className="flex items-center justify-center w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl dark:bg-emerald-500/10 dark:text-emerald-400">
              <DollarLineIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? (
                <span className="animate-pulse text-gray-400 text-lg">Calculating...</span>
              ) : (
                `$${(metrics?.totalCostUsd ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              ≈ ৳{(metrics?.totalCostBdt ?? 0).toLocaleString()} BDT (deducted from wallets)
            </p>
          </div>
        </div>

        {/* Active Resellers */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Resellers</span>
            <div className="flex items-center justify-center w-11 h-11 bg-purple-50 text-purple-600 rounded-xl dark:bg-purple-500/10 dark:text-purple-400">
              <GroupIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {loading ? (
                <span className="animate-pulse text-gray-400 text-lg">Calculating...</span>
              ) : (
                metrics?.uniqueResellersCount ?? 0
              )}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Unique authorized agencies / distributors
            </p>
          </div>
        </div>

        {/* End Clients Served */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">End Clients Served</span>
            <div className="flex items-center justify-center w-11 h-11 bg-amber-50 text-amber-600 rounded-xl dark:bg-amber-500/10 dark:text-amber-400">
              <UserCircleIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {loading ? (
                <span className="animate-pulse text-gray-400 text-lg">Calculating...</span>
              ) : (
                metrics?.uniqueClientsCount ?? 0
              )}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {metrics?.totalTransfers ?? 0} total dispatch events
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm space-y-4">
        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
              Date Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset("7d")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeDatePreset === "7d"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Last 7 Days (Default)
            </button>
            <button
              type="button"
              onClick={() => applyPreset("14d")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeDatePreset === "14d"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Last 14 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset("30d")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeDatePreset === "30d"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeDatePreset === "all"
                  ? "bg-brand-500 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              All Time
            </button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing <strong className="text-gray-800 dark:text-white">{data?.items?.length ?? 0}</strong> of{" "}
            <strong className="text-gray-800 dark:text-white">{data?.totalCount ?? 0}</strong> records
          </div>
        </div>

        {/* Inputs Grid */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
          {/* General Search */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Search Reseller / Client / Ref ID
            </label>
            <input
              type="text"
              placeholder="Search email, user ID, reference..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Proxy Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Proxy Network
            </label>
            <select
              value={proxyType}
              onChange={(e) => {
                setProxyType(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="ALL">All Proxy Networks</option>
              <option value="Residential">Residential Proxies</option>
              <option value="Premium Residential">Premium Residential</option>
            </select>
          </div>

          {/* Start Date (Reliable Native Date Input with High Contrast Icon) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActiveDatePreset("all");
                setPage(1);
              }}
              style={{ colorScheme: "light dark" }}
              className="date-filter-input block w-full h-10 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            />
          </div>

          {/* End Date (Reliable Native Date Input with High Contrast Icon) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActiveDatePreset("all");
                setPage(1);
              }}
              style={{ colorScheme: "light dark" }}
              className="date-filter-input block w-full h-10 px-3 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:border-brand-500 cursor-pointer"
            />
          </div>
        </form>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition shadow-xs cursor-pointer"
          >
            Apply Search
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
          >
            Reset to 7 Days
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Date & Time</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Reseller (From)</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Client (To)</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Network</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Volume</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Cost</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Balance Flow</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-3.5 py-3 font-semibold text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading reseller dispatch records...</span>
                    </div>
                  </td>
                </tr>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((item) => {
                  const pType = item.proxyType || (item as any).ProxyType || (item as any).proxy_type || "Residential";
                  const isPremium = pType.toLowerCase().includes("premium");
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Date */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(item.createdAt)}
                      </td>

                      {/* Reseller (From) */}
                      <td className="px-3.5 py-3">
                        <div className="flex flex-col">
                          <a
                            href={`/user-info?email=${encodeURIComponent(item.resellerEmail)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-brand-600 dark:text-brand-400 hover:underline max-w-[170px] truncate"
                            title={`Inspect Reseller: ${item.resellerEmail} (Opens in new tab)`}
                          >
                            <span>{item.resellerEmail}</span>
                          </a>
                          <span className="text-[11px] text-gray-400 font-mono">
                            ID: #{item.resellerUserId}
                          </span>
                        </div>
                      </td>

                      {/* Target Client (To) */}
                      <td className="px-3.5 py-3">
                        <div className="flex flex-col">
                          <a
                            href={`/user-info?email=${encodeURIComponent(item.targetEmail)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-gray-800 dark:text-gray-200 hover:text-brand-500 hover:underline max-w-[170px] truncate"
                            title={`Inspect Client: ${item.targetEmail} (Opens in new tab)`}
                          >
                            <span>{item.targetEmail}</span>
                          </a>
                          <span className="text-[11px] text-gray-400 font-mono">
                            ID: #{item.targetUserId}
                          </span>
                        </div>
                      </td>

                      {/* Proxy Network (Guaranteed Color Badge) */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isPremium
                              ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                              : "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
                          }`}
                        >
                          {pType}
                        </span>
                      </td>

                      {/* Volume */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-white">
                            {item.bandwidthGb} GB
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {(item.bandwidthMb || item.bandwidthGb * 1000).toLocaleString()} MB
                          </span>
                        </div>
                      </td>

                      {/* Deducted Cost */}
                      <td className="px-3.5 py-3 whitespace-nowrap font-medium text-rose-600 dark:text-rose-400">
                        <div className="flex flex-col">
                          <span>-${Number(item.totalCostUsd).toFixed(2)} USD</span>
                          <span className="text-[11px] text-gray-400 font-normal">
                            ৳{Number(item.totalCostBdt || Math.round(item.totalCostUsd * 125)).toLocaleString()} BDT
                          </span>
                        </div>
                      </td>

                      {/* Balance Flow */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                        <span className="text-gray-400">${Number(item.balanceBefore).toFixed(2)}</span>
                        <span className="mx-1 text-gray-300 dark:text-gray-600">➔</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                          ${Number(item.balanceAfter).toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {item.status || "COMPLETED"}
                        </span>
                      </td>

                      {/* Action: Clean View Details Button (Indestructible, Never Squished) */}
                      <td className="px-3.5 py-3 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white transition shadow-xs cursor-pointer whitespace-nowrap"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <p className="text-base font-semibold text-gray-600 dark:text-gray-300">
                      No dispatches found in this date range
                    </p>
                    <p className="mt-1 text-xs">
                      Try selecting &quot;Last 14 Days&quot; or &quot;All Time&quot; above to view older transfers.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {data && data.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              Page <strong className="text-gray-800 dark:text-white">{data.page}</strong> of{" "}
              <strong className="text-gray-800 dark:text-white">{data.totalPages}</strong> ({data.totalCount} total dispatches)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1 || loading}
                className="px-3 py-1.5 font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={data.page >= data.totalPages || loading}
                className="px-3 py-1.5 font-medium border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DISPATCH DETAILS MODAL (AGER STYLE - Clean Centered Dialog with high z-index) */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                    Dispatch Audit
                  </span>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    Ref: #{selectedItem.referenceId}
                  </span>
                </div>
                <h3 className="mt-1 text-xl font-bold text-gray-800 dark:text-white">
                  Dispatch Details
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fulfillment Time: {formatDate(selectedItem.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition"
                title="Close Modal (Esc)"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {(() => {
              const pType = selectedItem.proxyType || (selectedItem as any).ProxyType || (selectedItem as any).proxy_type || "Residential";
              const isPremium = pType.toLowerCase().includes("premium");
              return (
                <div className="py-5 space-y-4">
                  {/* Top Summary Metrics Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-center">
                    <div>
                      <span className="text-[11px] text-gray-400 font-medium block">Allocated Volume</span>
                      <strong className="text-base font-bold text-gray-800 dark:text-white block mt-0.5">
                        {selectedItem.bandwidthGb} GB
                      </strong>
                      <span className="text-[10px] text-gray-400">
                        {(selectedItem.bandwidthMb || selectedItem.bandwidthGb * 1000).toLocaleString()} MB
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-400 font-medium block">Proxy Network</span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-semibold ${
                          isPremium
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                        }`}
                      >
                        {pType}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-400 font-medium block">Wallet Deduction</span>
                      <strong className="text-base font-bold text-rose-600 dark:text-rose-400 block mt-0.5">
                        -${Number(selectedItem.totalCostUsd).toFixed(2)}
                      </strong>
                      <span className="text-[10px] text-gray-400">
                        ৳{Number(selectedItem.totalCostBdt || Math.round(selectedItem.totalCostUsd * 125)).toLocaleString()} BDT
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-gray-400 font-medium block">Dispatch Status</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Completed
                      </span>
                    </div>
                  </div>

                  {/* 2-Column Journey Comparison Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Reseller (From) */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-850 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center text-[10px] font-bold">1</span>
                          From (Reseller)
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          ID: #{selectedItem.resellerUserId}
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-gray-800 dark:text-white break-all">
                        {selectedItem.resellerEmail}
                      </div>

                      <div className="pt-2 text-xs border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-gray-500 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>Cost Deducted:</span>
                          <strong className="text-rose-600 dark:text-rose-400">-${Number(selectedItem.totalCostUsd).toFixed(2)} USD</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Balance Before:</span>
                          <span className="font-mono">${Number(selectedItem.balanceBefore).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Balance After:</span>
                          <strong className="font-mono text-gray-800 dark:text-gray-200">${Number(selectedItem.balanceAfter).toFixed(2)}</strong>
                        </div>
                      </div>

                      <div className="pt-2">
                        <a
                          href={`/user-info?email=${encodeURIComponent(selectedItem.resellerEmail)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-500 hover:text-white dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white transition shadow-xs cursor-pointer whitespace-nowrap"
                          title="Open Reseller Profile in a new tab"
                        >
                          Inspect Reseller Profile
                        </a>
                      </div>
                    </div>

                    {/* Target Client (To) */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-850 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">2</span>
                          To (Target Client)
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          ID: #{selectedItem.targetUserId}
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-gray-800 dark:text-white break-all">
                        {selectedItem.targetEmail}
                      </div>

                      <div className="pt-2 text-xs border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-gray-500 dark:text-gray-400">
                        <div className="flex justify-between">
                          <span>Traffic Credited:</span>
                          <strong className="text-emerald-600 dark:text-emerald-400">+{selectedItem.bandwidthGb} GB</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Traffic in MB:</span>
                          <span className="font-mono">+{(selectedItem.bandwidthMb || selectedItem.bandwidthGb * 1000).toLocaleString()} MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery State:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active in Client Pool</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <a
                          href={`/user-info?email=${encodeURIComponent(selectedItem.targetEmail)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-500 hover:text-white dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white transition shadow-xs cursor-pointer whitespace-nowrap"
                          title="Open Client Profile in a new tab"
                        >
                          Inspect Client Profile
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Audit Metadata Card */}
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 text-xs space-y-1.5 text-gray-500 dark:text-gray-400 font-mono">
                    <div className="flex justify-between">
                      <span className="font-sans text-gray-400">Reference ID:</span>
                      <span className="text-gray-700 dark:text-gray-300 select-all">{selectedItem.referenceId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-gray-400">Applied Wholesale Rate:</span>
                      <span className="text-gray-700 dark:text-gray-300">${Number(selectedItem.ratePerGbUsd).toFixed(2)} / GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-gray-400">Dispatch IP:</span>
                      <span className="text-gray-700 dark:text-gray-300">{selectedItem.clientIp || "Direct Portal"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-gray-400">Fulfillment Timestamp:</span>
                      <span className="text-gray-700 dark:text-gray-300">{formatDate(selectedItem.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(selectedItem, null, 2), "Audit JSON")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                title="Copy complete JSON audit record to clipboard"
              >
                <CopyIcon className="w-3.5 h-3.5" />
                <span>Copy Audit JSON</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-5 py-1.5 text-xs font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
