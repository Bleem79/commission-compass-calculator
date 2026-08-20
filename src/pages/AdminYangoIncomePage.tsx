import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Wallet, Upload, Download, Trash2, Loader2, Search, Route, Banknote, CreditCard, Coins, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageLayout } from "@/components/shared/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface YangoIncomeRow {
  id: string;
  driver_id: string;
  shift: string | null;
  no_of_trips: number | null;
  cash_income: number | null;
  cashless_income: number | null;
  total_income: number | null;
  driver_income: number | null;
  income_date: string | null;
  vehicle_no: string | null;
}

const num = (v: any): number | null => {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
};

const toDate = (v: any): string | null => {
  if (!v) return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const parsed = new Date(String(v));
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const pick = (row: Record<string, any>, keys: string[]) => {
  for (const k of Object.keys(row)) {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (keys.includes(norm)) return row[k];
  }
  return undefined;
};

const fmt = (v: number | null) =>
  v === null ? "-" : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PAGE_SIZE = 15;

const AdminYangoIncomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<YangoIncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const size = 1000;
    let all: YangoIncomeRow[] = [];
    let p = 0;
    while (true) {
      const { data, error } = await supabase
        .from("yango_income")
        .select("*")
        .order("created_at", { ascending: false })
        .range(p * size, (p + 1) * size - 1);
      if (error) { toast.error("Failed to load records"); break; }
      all = [...all, ...(data as any[] as YangoIncomeRow[])];
      if (!data || data.length < size) break;
      p++;
    }
    setRows(all);
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) fetchRows(); }, [isAuthenticated, fetchRows]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      "Driver Id": "114587", "Shift": "Morning", "No. of Trips": 12,
      "Cash Income": 250, "Cashless Income": 180, "Total Income": 430,
      "Driver Income": 200, "Date": "2026-08-20", "Vehicle No": "A-12345",
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Yango Income");
    XLSX.writeFile(wb, "yango-income-template.xlsx");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const payload = raw
        .map((r) => ({
          driver_id: String(pick(r, ["driverid", "driverno", "id"]) ?? "").trim(),
          shift: pick(r, ["shift"]) ? String(pick(r, ["shift"])).trim() : null,
          no_of_trips: num(pick(r, ["nooftrips", "trips", "totaltrips"])),
          cash_income: num(pick(r, ["cashincome", "cash"])),
          cashless_income: num(pick(r, ["cashlessincome", "cashless"])),
          total_income: num(pick(r, ["totalincome"])),
          driver_income: num(pick(r, ["driverincome"])),
          income_date: toDate(pick(r, ["date", "incomedate"])),
          vehicle_no: pick(r, ["vehicleno", "vehicle", "taxino"]) ? String(pick(r, ["vehicleno", "vehicle", "taxino"])).trim() : null,
          uploaded_by: user.id,
        }))
        .filter((r) => r.driver_id);

      if (!payload.length) throw new Error("No valid rows found (Driver Id is required)");

      for (let i = 0; i < payload.length; i += 500) {
        const { error } = await supabase.from("yango_income").insert(payload.slice(i, i + 500) as any);
        if (error) throw error;
      }
      toast.success(`Uploaded ${payload.length} records`);
      await fetchRows();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const deleteAll = async () => {
    const { error } = await supabase.from("yango_income").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("Delete failed"); return; }
    toast.success("All records deleted");
    fetchRows();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map((r) => ({
      "Driver Id": r.driver_id, "Shift": r.shift ?? "", "No. of Trips": r.no_of_trips ?? "",
      "Cash Income": r.cash_income ?? "", "Cashless Income": r.cashless_income ?? "",
      "Total Income": r.total_income ?? "", "Driver Income": r.driver_income ?? "",
      "Date": r.income_date ?? "", "Vehicle No": r.vehicle_no ?? "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Yango Income");
    XLSX.writeFile(wb, "yango-income.xlsx");
  };

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.driver_id.toLowerCase().includes(q) || (r.vehicle_no ?? "").toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    totalTrips: filtered.reduce((sum, r) => sum + (r.no_of_trips ?? 0), 0),
    cashIncome: filtered.reduce((sum, r) => sum + (r.cash_income ?? 0), 0),
    cashlessIncome: filtered.reduce((sum, r) => sum + (r.cashless_income ?? 0), 0),
    totalIncome: filtered.reduce((sum, r) => sum + (r.total_income ?? 0), 0),
    driverIncome: filtered.reduce((sum, r) => sum + (r.driver_income ?? 0), 0),
    totalDrivers: new Set(filtered.map((r) => r.driver_id)).size,
  };

  useEffect(() => { setPage(1); }, [search]);

  return (
    <PageLayout
      title="Yango Income"
      icon={<Wallet className="h-6 w-6" />}
      backPath="/home"
      backLabel="Back to Home"
      gradient="from-background via-amber-50/50 to-orange-100/50"
    >
      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />Download Template
            </Button>
            {isAdmin && (
              <>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
                <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {uploading ? "Uploading..." : "Upload Excel"}
                </Button>
              </>
            )}
            <Button variant="outline" onClick={exportExcel} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-2" />Export
            </Button>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!rows.length} className="ml-auto">
                    <Trash2 className="h-4 w-4 mr-2" />Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all Yango income records?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes all {rows.length} records. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAll}>Delete All</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Excel columns: Driver Id, Shift, No. of Trips, Cash Income, Cashless Income, Total Income, Driver Income, Date, Vehicle No
          </p>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search Driver ID or Vehicle No" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-3">Driver ID</th>
                <th className="p-3">Shift</th>
                <th className="p-3 text-right">No. of Trips</th>
                <th className="p-3 text-right">Cash Income</th>
                <th className="p-3 text-right">Cashless Income</th>
                <th className="p-3 text-right">Total Income</th>
                <th className="p-3 text-right">Driver Income</th>
                <th className="p-3">Date</th>
                <th className="p-3">Vehicle No</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              ) : current.length === 0 ? (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">No records found</td></tr>
              ) : current.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-medium">{r.driver_id}</td>
                  <td className="p-3">{r.shift ?? "-"}</td>
                  <td className="p-3 text-right">{r.no_of_trips ?? "-"}</td>
                  <td className="p-3 text-right">{fmt(r.cash_income)}</td>
                  <td className="p-3 text-right">{fmt(r.cashless_income)}</td>
                  <td className="p-3 text-right">{fmt(r.total_income)}</td>
                  <td className="p-3 text-right">{fmt(r.driver_income)}</td>
                  <td className="p-3">{r.income_date ?? "-"}</td>
                  <td className="p-3">{r.vehicle_no ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({filtered.length} records)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default AdminYangoIncomePage;