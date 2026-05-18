"use client";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Commission {
  id: number;
  referrerUserId: number;
  referredUserId: number;
  sourceOrderId: string;
  purchaseAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
  approvedAt: string | null;
}

export default function PendingCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_URL}/api/admin/commissions/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data: Commission[] = await res.json();
      setCommissions(data);
    } catch {
      toast.error("Failed to load pending commissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  const handleApprove = async (id: number) => {
    setApproving(id);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_URL}/api/admin/commissions/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Approval failed");
      toast.success(data.message || "Commission approved!");
      setCommissions((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to approve commission.");
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
            Pending Commissions
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Approve commissions to credit the affiliate&apos;s balance.
          </p>
        </div>
        <button
          onClick={fetchCommissions}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : commissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-20 text-center dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400">No pending commissions.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {["ID", "Referrer ID", "Referred ID", "Order ID", "Purchase Amount", "Commission (5%)", "Date", "Action"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {commissions.map((c) => (
                <tr key={c.id} className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                  <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-200">{c.id}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{c.referrerUserId}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">{c.referredUserId}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{c.sourceOrderId}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                    ${(Number(c.purchaseAmount) / 125).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">
                    ${(Number(c.commissionAmount) / 125).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleApprove(c.id)}
                      disabled={approving === c.id}
                      className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {approving === c.id ? "Approving..." : "Approve"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
