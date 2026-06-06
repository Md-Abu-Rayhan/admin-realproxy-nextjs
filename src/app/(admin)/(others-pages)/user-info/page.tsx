"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

const API_URL = "http://127.0.0.1:5001";
// const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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

interface UserInfo {
  id: number;
  email: string;
  referralCode: string | null;
  invitationCode: string | null;
  affiliateBalance: number;
  totalEarned: number;
  proxyAccount: string | null;
  proxyPassword: string | null;
  createdAt: string;

  paymentSummary: PaymentSummary | null;
  recentPayments: Payment[] | null;

  cryptoPayments: CryptoPayment[] | null;

  affiliateSummary: AffiliateSummary | null;
  commissions: AffiliateCommission[] | null;

  walletPurchases: WalletPurchase[] | null;
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
    Failed: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
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
  const searchParams = useSearchParams();

  const doSearch = useCallback(async (searchEmail: string) => {
    if (!searchEmail.trim()) return;
    setLoading(true);
    setSearched(true);
    setData(null);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_URL}/api/Admin/user/${encodeURIComponent(searchEmail.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) {
        toast.error("User not found");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const json: UserInfo = await res.json();
      setData(json);
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

  return (
    <div className="space-y-6">
      {/* Header + Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-white/[0.03]">
        <h1 className="mb-1 text-2xl font-semibold text-gray-800 dark:text-white/90">User Info</h1>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Search for a user by email to view all account details.
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
          {/* ===== Basic Info ===== */}
          <SectionCard title="Basic Information">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {statCard("User ID", data.id)}
              {statCard("Email", data.email)}
              {statCard("Referral Code", data.referralCode || "—", data.referralCode ? "text-blue-600 dark:text-blue-400" : undefined)}
              {statCard("Invitation Code", data.invitationCode || "—")}
              {statCard("Affiliate Balance", `$${(data.affiliateBalance / 125).toFixed(2)}`, "text-green-600 dark:text-green-400")}
              {statCard("Total Earned", `$${(data.totalEarned / 125).toFixed(2)}`, "text-green-600 dark:text-green-400")}
              {statCard("Proxy Account", data.proxyAccount || "—")}
              {statCard("Proxy Password", data.proxyPassword || "—")}
              {statCard("Created At", new Date(data.createdAt).toLocaleDateString())}
            </div>
          </SectionCard>

          {/* ===== Payment Summary ===== */}
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

          {/* ===== Recent Payments ===== */}
          {data.recentPayments && (
            <SectionCard title={`Recent Payments (${data.recentPayments.length})`}>
              <DataTable
                headers={["Order ID", "Product", "Amount", "Status", "Method", "Date"]}
                rows={data.recentPayments.map((p) => [
                  <span key={p.id} className="font-mono text-xs">{p.customerOrderId}</span>,
                  p.productName,
                  `$${(p.amount / 125).toFixed(2)}`,
                  <Badge key={p.id} status={p.status} />,
                  p.paymentMethod || "—",
                  new Date(p.createdAt).toLocaleDateString(),
                ])}
              />
            </SectionCard>
          )}

          {/* ===== Crypto Payments ===== */}
          {data.cryptoPayments && (
            <SectionCard title={`Crypto Payments (${data.cryptoPayments.length})`}>
              <DataTable
                headers={["Order ID", "Amount (USD)", "Paid", "Asset", "Status", "Date"]}
                rows={data.cryptoPayments.map((c) => [
                  <span key={c.id} className="font-mono text-xs">{c.orderId}</span>,
                  `$${(c.amount / 125).toFixed(2)}`,
                  c.paymentAmount || "—",
                  c.paymentAssetId || "—",
                  <Badge key={c.id} status={c.status} />,
                  new Date(c.createdAt).toLocaleDateString(),
                ])}
              />
            </SectionCard>
          )}

          {/* ===== Affiliate Summary ===== */}
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

          {/* ===== Commissions ===== */}
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
                  new Date(c.createdAt).toLocaleDateString(),
                ])}
              />
            </SectionCard>
          )}

          {/* ===== Wallet Purchases ===== */}
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
                  new Date(w.createdAt).toLocaleDateString(),
                ])}
              />
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
