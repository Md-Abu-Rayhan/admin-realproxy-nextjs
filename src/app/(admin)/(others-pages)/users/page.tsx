"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";

interface UserRow {
  id: number;
  email: string;
  referralCode: string | null;
  affiliateBalance: number;
  walletBalance?: number;
  totalEarned: number;
  proxyAccount: string | null;
  isReseller?: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  items: UserRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export default function UsersPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [resellerFilter, setResellerFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Quick edit modal state
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editIsReseller, setEditIsReseller] = useState<boolean>(false);
  const [adjustType, setAdjustType] = useState<"ADD" | "DEDUCT">("ADD");
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const pageSize = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (resellerFilter === "reseller") params.set("isReseller", "true");
      if (resellerFilter === "regular") params.set("isReseller", "false");

      const res = await apiFetch(`/api/Admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json: PaginatedResponse = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, search, resellerFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleOpenEdit = (user: UserRow) => {
    setEditingUser(user);
    setEditIsReseller(!!user.isReseller);
    setAdjustType("ADD");
    setAdjustAmount("");
    setAdjustReason("");
  };

  const handleSaveModal = async () => {
    if (!editingUser) return;
    setSavingEdit(true);

    try {
      let updatedReseller = editingUser.isReseller;
      let newBalance = editingUser.walletBalance ?? 0;

      // 1. If Reseller status changed
      if (editIsReseller !== !!editingUser.isReseller) {
        const resReseller = await apiFetch(`/api/Admin/users/${editingUser.id}/reseller`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isReseller: editIsReseller }),
        });
        if (!resReseller.ok) throw new Error("Failed to update reseller status");
        updatedReseller = editIsReseller;
        toast.success(`User reseller status set to ${editIsReseller ? "Reseller" : "Regular User"}`);
      }

      // 2. If Balance adjustment is requested
      const parsedAmount = parseFloat(adjustAmount);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        const resBalance = await apiFetch(`/api/Admin/users/${editingUser.id}/adjust-balance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountUsd: parsedAmount,
            adjustmentType: adjustType,
            reason: adjustReason.trim() || undefined,
          }),
        });

        const balanceJson = await resBalance.json();
        if (!resBalance.ok || !balanceJson.success) {
          throw new Error(balanceJson.message || "Failed to adjust balance");
        }

        newBalance = balanceJson.newWalletBalance ?? balanceJson.balanceAfter ?? newBalance;
        toast.success(balanceJson.message || `Balance adjusted successfully.`);
      }

      // Update in local data table
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((u) =>
            u.id === editingUser.id
              ? { ...u, isReseller: updatedReseller, walletBalance: newBalance }
              : u
          ),
        };
      });

      setEditingUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save changes";
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">All Users</h1>
              {resellerFilter !== "all" && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                  Filter: {resellerFilter === "reseller" ? "Resellers Only" : "Regular Only"}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {data ? `${data.totalCount} total users — Page ${data.page} of ${data.totalPages}` : "Loading..."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Reseller Status Filter */}
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-1 text-sm dark:border-gray-600 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => {
                  setResellerFilter("all");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  resellerFilter === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                All Users
              </button>
              <button
                type="button"
                onClick={() => {
                  setResellerFilter("reseller");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  resellerFilter === "reseller"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                <span>👑</span> Resellers Only
              </button>
              <button
                type="button"
                onClick={() => {
                  setResellerFilter("regular");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  resellerFilter === "regular"
                    ? "bg-gray-700 text-white shadow-sm dark:bg-gray-600"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                Regular Only
              </button>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by email or proxy..."
                className="block min-w-[200px] sm:min-w-[240px] rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
              >
                Search
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Clear
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Referral</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Wallet</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Affiliate</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Earned</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Proxy</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Action</th>
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
                    {search ? `No users matching "${search}".` : "No users found."}
                  </td>
                </tr>
              ) : (
                data?.items.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{user.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 dark:text-white/90">{user.email}</span>
                        {user.isReseller && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                            <span>👑</span> Reseller
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                      <span className="font-mono text-xs">{user.referralCode || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      ${(user.walletBalance || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                      ${(user.affiliateBalance / 125).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">
                      ${(user.totalEarned / 125).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                      {user.proxyAccount ? (
                        <span className="font-mono text-xs">{user.proxyAccount}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/user-info?email=${encodeURIComponent(user.email)}`}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Edit
                        </button>
                      </div>
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
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Previous
              </button>

              {/* Page numbers */}
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

      {/* Quick Edit Modal (Reseller + Balance Adjust) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit User Settings & Balance</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-5">
              {/* User Overview */}
              <div className="rounded-lg bg-gray-50 p-3.5 dark:bg-gray-800/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">User Email</p>
                  <p className="font-mono text-sm font-medium text-gray-800 dark:text-gray-200">{editingUser.email}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">User ID: #{editingUser.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Current Balance</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ${(editingUser.walletBalance || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* 1. Reseller Authorization */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsReseller}
                    onChange={(e) => setEditIsReseller(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-1.5">
                      <span>👑</span> Is Authorized Reseller
                    </span>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Grant wholesale reseller privileges to this user.
                    </p>
                  </div>
                </label>
              </div>

              {/* 2. Balance Adjustment (Add / Deduct) */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-1.5 mb-3">
                  <span>💰</span> Adjust Wallet Balance (Add / Deduct)
                </h4>

                <div className="space-y-3">
                  {/* Action choice: Add or Deduct */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType("ADD")}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                        adjustType === "ADD"
                          ? "bg-emerald-600 text-white shadow"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      ➕ Add Balance (Credit)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType("DEDUCT")}
                      className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
                        adjustType === "DEDUCT"
                          ? "bg-rose-600 text-white shadow"
                          : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      ➖ Deduct Balance (Debit)
                    </button>
                  </div>

                  {/* Amount input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Amount (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-semibold text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                        placeholder="0.00 (leave blank to keep unchanged)"
                        className="block w-full rounded-lg border border-gray-300 bg-white pl-8 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                      />
                    </div>
                  </div>

                  {/* Reason input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Reason / Description (stored in DB audit log)
                    </label>
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="e.g. Manual deposit, compensation, correction..."
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveModal}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
