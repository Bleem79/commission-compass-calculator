import React, { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { Car, Search, Download, RefreshCw, Loader2, X, Trash2, BarChart3, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageLayout } from "@/components/shared/PageLayout";
import { YangoAnalyticsDialog } from "@/components/admin/YangoAnalyticsDialog";
import { YangoDriverListDialog } from "@/components/admin/YangoDriverListDialog";

interface YangoRecord {
  id: string;
  driver_id: string | null;
  driver_name: string | null;
  mobile_no: string | null;
  phone_type: string;
  has_data: string;
  created_at: string;
}

const PAGE_SIZE = 15;

const AdminYangoPage = () => {
  const [records, setRecords] = useState<YangoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [driverQuery, setDriverQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDriverList, setShowDriverList] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const all: YangoRecord[] = [];
      let from = 0;
      const batch = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("yango_responses")
          .select("id, driver_id, driver_name, mobile_no, phone_type, has_data, created_at")
          .order("created_at", { ascending: false })
          .range(from, from + batch - 1);
        if (error) throw error;
        const rows = (data as YangoRecord[]) || [];
        all.push(...rows);
        if (rows.length < batch) break;
        from += batch;
      }
      setRecords(all);
    } catch (err) {
      console.error("Error fetching Yango responses:", err);
      toast.error("Failed to load Yango submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (rec: YangoRecord) => {
    if (!confirm(`Delete the Yango submission of ${rec.driver_id || "this driver"}?`)) return;
    setDeletingId(rec.id);
    const { error } = await supabase.from("yango_responses").delete().eq("id", rec.id);
    setDeletingId(null);
    if (error) {
      toast.error(error.message || "Failed to delete submission.");
      return;
    }
    setRecords((prev) => prev.filter((r) => r.id !== rec.id));
    toast.success("Submission deleted.");
  };

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

  const androidCount = filtered.filter((r) => r.phone_type === "Android").length;
  const iphoneCount = filtered.filter((r) => r.phone_type === "iPhone").length;
  const withData = filtered.filter((r) => r.has_data === "Yes").length;

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No submissions to export.");
      return;
    }
    const rows = filtered.map((r) => ({
      "Driver ID": r.driver_id || "",
      "Driver Name": r.driver_name || "",
      "Contact No": r.mobile_no || "",
      "Smartphone": r.phone_type,
      "Monthly Data": r.has_data,
      Date: format(new Date(r.created_at), "dd MMM yyyy"),
      Time: format(new Date(r.created_at), "hh:mm a"),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Yango");
    XLSX.writeFile(wb, `yango-submissions-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Exported to Excel.");
  };

  return (
    <PageLayout
      title="Yango — Submissions"
      icon={<Car className="h-6 w-6" />}
      backPath="/home"
      backLabel="Back"
      maxWidth="6xl"
      variant="dark"
      gradient="from-slate-900 via-purple-900 to-slate-900"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          ["Total Submissions", filtered.length],
          ["Android", androidCount],
          ["iPhone", iphoneCount],
          ["With Monthly Data", withData],
        ].map(([label, value]) => (
          <div key={label as string} className="bg-white/10 border border-white/20 rounded-xl p-4">
            <p className="text-xs uppercase tracking-widest text-white/50">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/10 border border-white/20 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="text-xs text-white/60 mb-1.5 block">Search Driver ID / Name</label>
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
            onClick={() => setShowAnalytics(true)}
            className="bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white font-semibold"
          >
            <BarChart3 className="w-4 h-4 mr-2" /> View Analysis
          </Button>
          <Button
            onClick={() => setShowDriverList(true)}
            className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Upload Driver List
          </Button>
          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
          >
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      <YangoAnalyticsDialog open={showAnalytics} onOpenChange={setShowAnalytics} records={filtered} />
      <YangoDriverListDialog open={showDriverList} onOpenChange={setShowDriverList} />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/60">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading submissions...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-white/40 gap-3 py-16">
          <Car className="w-12 h-12" />
          <p className="text-sm">No Yango submissions found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-white/20 bg-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60 text-xs uppercase tracking-wider border-b border-white/10">
                  <th className="text-left font-medium px-4 py-3">Driver ID</th>
                  <th className="text-left font-medium px-4 py-3">Driver Name</th>
                  <th className="text-left font-medium px-4 py-3">Contact No</th>
                  <th className="text-left font-medium px-4 py-3">Smartphone</th>
                  <th className="text-left font-medium px-4 py-3">Monthly Data</th>
                  <th className="text-left font-medium px-4 py-3">Date &amp; Time</th>
                  <th className="text-right font-medium px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-medium">{r.driver_id || "—"}</td>
                    <td className="px-4 py-3 text-white/80">{r.driver_name || "—"}</td>
                    <td className="px-4 py-3 text-white/80">{r.mobile_no || "—"}</td>
                    <td className="px-4 py-3 text-white/80">{r.phone_type}</td>
                    <td className="px-4 py-3 text-white font-semibold">{r.has_data}</td>
                    <td className="px-4 py-3 text-white/70">
                      {format(new Date(r.created_at), "dd MMM yyyy • hh:mm a")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === r.id}
                        onClick={() => handleDelete(r)}
                        className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
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

export default AdminYangoPage;
