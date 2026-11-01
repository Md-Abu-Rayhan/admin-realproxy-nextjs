"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";

interface PaymentSummary {
  totalTransactions: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  cancelledCount: number;
  expiredCount: number;
  totalRevenue: number;
  averageTransactionAmount: number;
}

interface AffiliateSummary {
  totalReferrals: number;
  activeBuyers: number;
  approvedCommission: number;
  pendingCommission: number;
}

interface Payment {
  id: number;
  customerOrderId: string;
  merchantTransactionId: string;
  epsTransactionId: string | null;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  productName: string;
  createdAt: string;
}

interface CryptoPayment {
  id: number;
  orderId: string;
  amount: number;
  status: string;
  paymentAssetId: string | null;
  paymentAmount: string | null;
  createdAt: string;
}

interface AffiliateCommission {
  id: number;
  referredUserId: number;
  sourceOrderId: string;
  purchaseAmount: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
  approvedAt: string | null;
}

interface WalletPurchase {
  id: number;
  bandwidthGb: number;
  amountDeducted: number;
  balanceMb: number;
  status: string;
  createdAt: string;
}

interface WalletTransaction {
  id: number;
  userId: number;
  transactionType: string;
  amountUsd: number;
  amountBdt: number;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod: string;
  gatewayTransactionId?: string | null;
  referenceId?: string | null;
  status: string;
  description: string;
  adminUserId?: number | null;
  createdAt: string;
}

interface UserInfo {
  id: number;
  email: string;
  referralCode: string | null;
  invitationCode: string | null;
  affiliateBalance: number;
  walletBalance: number;
  totalEarned: number;
  proxyAccount: string | null;
  proxyPassword: string | null;
  isReseller?: boolean;
  createdAt: string;

  paymentSummary: PaymentSummary | null;
  recentPayments: Payment[] | null;

  cryptoPayments: CryptoPayment[] | null;

  affiliateSummary: AffiliateSummary | null;
  commissions: AffiliateCommission[] | null;

  walletPurchases: WalletPurchase[] | null;
  walletTransactions: WalletTransaction[] | null;
}

function statCard(label: string, value: string | number, color = "text-gray-800 dark:text-white") {
  return (
    <div className="rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/[0.03]">
      <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">{title}</h2>
      {children}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Success: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
    COMPLETED: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
    Failed: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    Cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
    Expired: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[status] || "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400"}`}>
      {status}
    </span>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-6 text-center text-gray-400">
                No data
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2.5 text-gray-700 dark:text-gray-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function UserInfoPage() {
  const [email, setEmail] = useState("");
  const [data, setData] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Reseller state
  const [isReseller, setIsReseller] = useState<boolean>(false);
  const [savingReseller, setSavingReseller] = useState<boolean>(false);

  // Wallet adjustment state
  const [adjustType, setAdjustType] = useState<"ADD" | "DEDUCT">("ADD");
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [savingAdjust, setSavingAdjust] = useState<boolean>(false);

  const searchParams = useSearchParams();

  const doSearch = useCallback(async (searchEmail: string) => {
    if (!searchEmail.trim()) return;
    setLoading(true);
    setSearched(true);
    setData(null);
    try {
      const res = await apiFetch(`/api/Admin/user/${encodeURIComponent(searchEmail.trim())}`);
      if (res.status === 404) {
        toast.error("User not found");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json: UserInfo = await res.json();
      setData(json);
      setIsReseller(!!json.isReseller);
    } catch {
      toast.error("Failed to load user info.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-search when email query param is present (e.g. from Users list)
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      doSearch(emailParam);
    }
  }, [searchParams, doSearch]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSearch(email);
  };

  const handleSaveReseller = async () => {
    if (!data) return;
    setSavingReseller(true);
    try {
      const res = await apiFetch(`/api/Admin/users/${data.id}/reseller`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isReseller }),
      });
      if (!res.ok) throw new Error("Failed to update reseller status");
      
      toast.success(
        `User ${data.email} status updated to ${isReseller ? "Reseller" : "Regular User"}.`
      );
      setData((prev) => (prev ? { ...prev, isReseller } : null));
    } catch {
      toast.error("Failed to update reseller status.");
    } finally {
      setSavingReseller(false);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const parsedAmount = parseFloat(adjustAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than $0.00");
      return;
    }

    setSavingAdjust(true);
    try {
      const res = await apiFetch(`/api/Admin/users/${data.id}/adjust-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: parsedAmount,
          adjustmentType: adjustType,
          reason: adjustReason.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to adjust balance");
      }

      toast.success(json.message || "Wallet balance adjusted successfully!");

      const newBal = json.newWalletBalance ?? json.balanceAfter ?? data.walletBalance;

      // Construct transaction log item to prepend
      const newTx: WalletTransaction = {
        id: Date.now(),
        userId: data.id,
        transactionType: "ADMIN_ADJUST",
        amountUsd: parsedAmount,
        amountBdt: 0,
        balanceBefore: json.balanceBefore ?? data.walletBalance,
        balanceAfter: newBal,
        paymentMethod: "ADMIN",
        status: "COMPLETED",
        description: `Admin adjustment (${adjustType}): ${adjustReason.trim() || "Manual adjustment"}`,
        createdAt: new Date().toISOString(),
      };

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          walletBalance: newBal,
          walletTransactions: [newTx, ...(prev.walletTransactions || [])],
        };
      });

      setAdjustAmount("");
      setAdjustReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to adjust balance";
      toast.error(msg);
    } finally {
      setSavingAdjust(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/[0.03]">
        <h1 className="mb-1 text-2xl font-semibold text-gray-800 dark:text-white/90">User Info</h1>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Search for a user by email to manage balance, reseller permissions, and view account logs.
        </p>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter user email..."
            className="block w-full max-w-md rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {/* Not found */}
      {!loading && searched && !data && (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400">No user found with that email.</p>
        </div>
      )}

      {/* User Data */}
      {data && (
        <>
          {/* ===== 1. Balance Adjustment & Management Card ===== */}
          <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 p-5 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Wallet Balance Adjustment</h2>
                </div>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Manually add (credit) or deduct (debit) funds from this user&apos;s wallet. Every change is recorded in the database ledger.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Current Balance:</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    ${(data.walletBalance || 0).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Adjustment Form */}
              <form onSubmit={handleAdjustBalance} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-white p-4 rounded-xl border border-blue-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Action
                  </label>
                  <div className="flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => setAdjustType("ADD")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                        adjustType === "ADD"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                      }`}
                    >
                      ➕ Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType("DEDUCT")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                        adjustType === "DEDUCT"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                      }`}
                    >
                      ➖ Deduct
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Amount ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder="0.00"
                      className="block w-28 rounded-lg border border-gray-300 bg-white pl-6 pr-2 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Reason / Description
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="e.g. Deposit compensation, bonus..."
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingAdjust}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {savingAdjust ? "Processing..." : "Submit Adjustment"}
                </button>
              </form>
            </div>
          </div>

          {/* ===== 2. Reseller Status Bar ===== */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">👑</span>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Reseller Authorization</h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Toggle whether this user is an authorized Reseller eligible for wholesale volume and sub-accounts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isReseller}
                    onChange={(e) => setIsReseller(e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Is Reseller
                  </span>
                </label>

                <button
                  type="button"
                  disabled={savingReseller || isReseller === !!data.isReseller}
                  onClick={handleSaveReseller}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingReseller ? "Saving..." : "Save Reseller Status"}
                </button>
              </div>
            </div>
          </div>

          {/* ===== 3. Basic Information ===== */}
          <SectionCard title="Basic Information">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {statCard("User ID", data.id)}
              {statCard("Email", data.email)}
              {statCard(
                "Wallet Balance",
                `$${(data.walletBalance || 0).toFixed(2)}`,
                "text-emerald-600 dark:text-emerald-400 font-bold"
              )}
              {statCard(
                "Account Role",
                data.isReseller ? "👑 Reseller" : "Regular User",
                data.isReseller ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-gray-600 dark:text-gray-300"
              )}
              {statCard("Referral Code", data.referralCode || "—", data.referralCode ? "text-blue-600 dark:text-blue-400" : undefined)}
              {statCard("Invitation Code", data.invitationCode || "—")}
              {statCard("Affiliate Balance", `$${(data.affiliateBalance / 125).toFixed(2)}`, "text-green-600 dark:text-green-400")}
              {statCard("Total Earned", `$${(data.totalEarned / 125).toFixed(2)}`, "text-green-600 dark:text-green-400")}
              {statCard("Proxy Account", data.proxyAccount || "—")}
              {statCard("Proxy Password", data.proxyPassword || "—")}
              {statCard("Created At", new Date(data.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }))}
            </div>
          </SectionCard>

          {/* ===== 4. Wallet Ledger & Adjustment Logs ===== */}
          <SectionCard title={`Wallet & Adjustment History (${data.walletTransactions?.length || 0})`}>
            <DataTable
              headers={["Tx ID", "Date", "Type", "Amount", "Balance Before", "Balance After", "Method", "Description / Reason", "Status"]}
              rows={(data.walletTransactions || []).map((t) => [
                <span key={t.id} className="font-mono text-xs text-gray-500">#{t.id}</span>,
                new Date(t.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                <span
                  key={t.id + "-type"}
                  className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                    t.transactionType === "ADMIN_ADJUST"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      : t.transactionType === "TOPUP"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : t.transactionType === "PURCHASE"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {t.transactionType}
                </span>,
                <span
                  key={t.id + "-amt"}
                  className={`font-semibold ${
                    t.balanceAfter >= t.balanceBefore
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {t.balanceAfter >= t.balanceBefore ? "+" : "-"}${t.amountUsd.toFixed(2)}
                </span>,
                `$${t.balanceBefore.toFixed(2)}`,
                <span key={t.id + "-aft"} className="font-semibold text-gray-800 dark:text-gray-200">
                  ${t.balanceAfter.toFixed(2)}
                </span>,
                <span key={t.id + "-pm"} className="font-mono text-xs">{t.paymentMethod || "—"}</span>,
                <span key={t.id + "-desc"} className="text-xs text-gray-700 dark:text-gray-300 max-w-xs truncate inline-block" title={t.description}>
                  {t.description || "—"}
                </span>,
                <Badge key={t.id + "-st"} status={t.status} />,
              ])}
            />
          </SectionCard>

          {/* ===== 5. Payment Summary (EPS) ===== */}
          {data.paymentSummary && (
            <SectionCard title="Payment Summary (EPS)">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
                {statCard("Total", data.paymentSummary.totalTransactions)}
                {statCard("Success", data.paymentSummary.successCount, "text-green-600 dark:text-green-400")}
                {statCard("Failed", data.paymentSummary.failedCount, "text-red-600 dark:text-red-400")}
                {statCard("Pending", data.paymentSummary.pendingCount, "text-yellow-600 dark:text-yellow-400")}
                {statCard("Cancelled", data.paymentSummary.cancelledCount)}
                {statCard("Expired", data.paymentSummary.expiredCount)}
                {statCard("Revenue", `$${(data.paymentSummary.totalRevenue / 125).toFixed(2)}`, "text-green-600 dark:text-green-400")}
                {statCard("Avg", `$${(data.paymentSummary.averageTransactionAmount / 125).toFixed(2)}`)}
              </div>
            </SectionCard>
          )}

          {/* ===== 6. Recent Payments ===== */}
          {data.recentPayments && (
            <SectionCard title={`Recent Payments (${data.recentPayments.length})`}>
              <DataTable
                headers={["Order ID/EpsTrxId", "Merchant ID", "Product", "Amount", "Status", "Method", "Date"]}
                rows={data.recentPayments.map((p) => [
                  <span key={p.id} className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs">{p.customerOrderId}</span>
                    {p.epsTransactionId && (
                      <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">TXN: {p.epsTransactionId}</span>
                    )}
                  </span>,
                  <span key={p.id + "-m"} className="font-mono text-xs">{p.merchantTransactionId || "—"}</span>,
                  p.productName,
                  `$${(p.amount / 125).toFixed(2)}`,
                  <Badge key={p.id} status={p.status} />,
                  p.paymentMethod || "—",
                  new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                ])}
              />
            </SectionCard>
          )}

          {/* ===== 7. Crypto Payments ===== */}
          {data.cryptoPayments && (
            <SectionCard title={`Crypto Payments (${data.cryptoPayments.length})`}>
              <DataTable
                headers={["Order ID", "Amount (USD)", "Paid", "Asset", "Status", "Date"]}
                rows={data.cryptoPayments.map((c) => [
                  <span key={c.id} className="font-mono text-xs">{c.orderId}</span>,
                  `$${c.amount.toFixed(2)}`,
                  c.paymentAmount || "—",
                  c.paymentAssetId || "—",
                  <Badge key={c.id} status={c.status} />,
                  new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                ])}
              />
            </SectionCard>
          )}

          {/* ===== 8. Affiliate Summary ===== */}
          {data.affiliateSummary && (
            <SectionCard title="Affiliate Summary">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {statCard("Total Referrals", data.affiliateSummary.totalReferrals)}
                {statCard("Active Buyers", data.affiliateSummary.activeBuyers)}
                {statCard("Approved Commission", `$${(data.affiliateSummary.approvedCommission / 125).toFixed(2)}`, "text-green-600 dark:text-green-400")}
                {statCard("Pending Commission", `$${(data.affiliateSummary.pendingCommission / 125).toFixed(2)}`, "text-yellow-600 dark:text-yellow-400")}
              </div>
            </SectionCard>
          )}

          {/* ===== 9. Commissions ===== */}
          {data.commissions && (
            <SectionCard title={`Affiliate Commissions (${data.commissions.length})`}>
              <DataTable
                headers={["ID", "Referred User", "Order", "Purchase Amt", "Commission", "Status", "Date"]}
                rows={data.commissions.map((c) => [
                  c.id,
                  c.referredUserId,
                  <span key={c.id} className="font-mono text-xs">{c.sourceOrderId}</span>,
                  `$${(c.purchaseAmount / 125).toFixed(2)}`,
                  `$${(c.commissionAmount / 125).toFixed(2)}`,
                  <Badge key={c.id} status={c.status} />,
                  new Date(c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                ])}
              />
            </SectionCard>
          )}

          {/* ===== 10. Wallet Purchases ===== */}
          {data.walletPurchases && (
            <SectionCard title={`Wallet Purchases (${data.walletPurchases.length})`}>
              <DataTable
                headers={["ID", "Bandwidth (GB)", "Deducted", "Balance (MB)", "Status", "Date"]}
                rows={data.walletPurchases.map((w) => [
                  w.id,
                  w.bandwidthGb,
                  `$${(w.amountDeducted / 125).toFixed(2)}`,
                  w.balanceMb.toFixed(1),
                  <Badge key={w.id} status={w.status} />,
                  new Date(w.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
                ])}
              />
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
