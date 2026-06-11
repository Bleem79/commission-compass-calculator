import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { CreditCard, Search, Download, RefreshCw, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageLayout } from "@/components/shared/PageLayout";

interface CollectionRecord {
  id: string;
  driver_id: string | null;
  driver_name: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

const PAGE_SIZE = 15;

const formatAmount = (value: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const AdminCollectPaymentPage = () => {
  const { canAccessAdminPages } = useAuth();

  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverQuery, setDriverQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const all: CollectionRecord[] = [];
      let from = 0;
      const batch = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("payment_collections")
          .select("id, driver_id, driver_name, amount, currency, status, created_at")
          .order("created_at", { ascending: false })
          .range(from, from + batch - 1);
        if (error) throw error;
        const rows = (data as CollectionRecord[]) || [];
        all.push(...rows);
        if (rows.length < batch) break;
        from += batch;
      }
      setRecords(all);
    } catch (err) {
      console.error("Error fetching collections:", err);
      toast.error("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const filtered = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    return records.filter((r) => {
      const matchesDriver =
        !q ||
        (r.driver_id || "").toLowerCase().includes(q) ||
        (r.driver_name || "").toLowerCase().includes(q);
      const matchesDate =
        !dateFilter || format(new Date(r.created_at), "yyyy-MM-dd") === dateFilter;
      return matchesDriver && matchesDate;
    });
  }, [records, driverQuery, dateFilter]);

  useEffect(() => {
    setPage(1);
  }, [driverQuery, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalAmount = filtered.reduce((sum, r) => sum + Number(r.amount), 0);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No transactions to export.");
      return;
    }
    const rows = filtered.map((r) => ({
      "Driver ID": r.driver_id || "",
      "Driver Name": r.driver_name || "",
      "Amount (AED)": Number(r.amount),
      Status: r.status === "paid" ? "Paid" : "Pending",
      Date: format(new Date(r.created_at), "dd MMM yyyy"),
      Time: format(new Date(r.created_at), "hh:mm a"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `collect-payment-transactions-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Exported to Excel.");
  };

  const getStatusBadge = (status: string) =>
    status === "paid" ? (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Paid</Badge>
    ) : (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Pending</Badge>
    );

  return (
    <PageLayout
      title="Collect Payment — Transactions"
      icon={<CreditCard className="h-6 w-6" />}
      backPath="/home"
      backLabel="Back"
      maxWidth="6xl"
      variant="dark"
      gradient="from-slate-900 via-purple-900 to-slate-900"
    >
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/10 border border-white/20 rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-white/50">Transactions</p>
          <p className="text-2xl font-bold text-white">{filtered.length}</p>
        </div>
        <div className="bg-white/10 border border-white/20 rounded-xl p-4">
          <p className="text-xs uppercase tracking-widest text-white/50">Total Amount</p>
          <p className="text-2xl font-bold text-white">AED {formatAmount(totalAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/10 border border-white/20 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="text-xs text-white/60 mb-1.5 block">Search by Driver ID / Name</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={driverQuery}
              onChange={(e) => setDriverQuery(e.target.value)}
              placeholder="e.g. 110800"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 pl-9"
            />
          </div>
        </div>
        <div className="sm:w-52">
          <label className="text-xs text-white/60 mb-1.5 block">Filter by Date</label>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white/10 border-white/20 text-white [color-scheme:dark]"
          />
        </div>
        {(driverQuery || dateFilter) && (
          <Button
            variant="outline"
            onClick={() => {
              setDriverQuery("");
              setDateFilter("");
            }}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchRecords}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
          >
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/60">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading transactions...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-white/40 gap-3 py-16">
          <CreditCard className="w-12 h-12" />
          <p className="text-sm">No transactions found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60 text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="text-left font-medium px-4 py-3">Driver ID</th>
                  <th className="text-left font-medium px-4 py-3">Driver Name</th>
                  <th className="text-right font-medium px-4 py-3">Amount</th>
                  <th className="text-center font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-medium">{r.driver_id || "—"}</td>
                    <td className="px-4 py-3 text-white/80">{r.driver_name || "—"}</td>
                    <td className="px-4 py-3 text-right text-white font-semibold">
                      AED {formatAmount(Number(r.amount))}
                    </td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-white/70">
                      {format(new Date(r.created_at), "dd MMM yyyy • hh:mm a")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-white/70 text-sm">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
};

export default AdminCollectPaymentPage;
