import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { GraduationCap, Upload, Download, Trash2, Loader2, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageLayout } from "@/components/shared/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseTrainingRows, type TrainingRow } from "@/utils/driverTraining";

const PAGE_SIZE = 15;

const AttendanceBadge = ({ value }: { value: string }) => (
  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
    value === "present" ? "bg-primary/15 text-primary" : value === "absent" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
  }`}>{value === "present" ? "Present" : value === "absent" ? "Absent" : "Pending"}</span>
);

const AdminDriverTrainingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => { if (!isAuthenticated) navigate("/login", { replace: true }); }, [isAuthenticated, navigate]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    let all: TrainingRow[] = [];
    for (let p = 0; ; p++) {
      const { data, error } = await (supabase as any).from("driver_trainings").select("*")
        .order("training_date", { ascending: false }).order("created_at", { ascending: false })
        .range(p * 1000, p * 1000 + 999);
      if (error) { toast.error("Failed to load trainings"); break; }
      all = all.concat(data || []);
      if (!data || data.length < 1000) break;
    }
    setRows(all);
    setLoading(false);
  }, []);

  useEffect(() => { if (isAuthenticated) fetchRows(); }, [isAuthenticated, fetchRows]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ "Driver Id": "114587", "Name": "Driver Name", "Name of Training": "Defensive Driving", "Date": "2026-11-10", "Time": "10:00 AM", "Room No": "Room 2" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trainings");
    XLSX.writeFile(wb, "driver-training-template.xlsx");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const { valid, skipped } = parseTrainingRows(raw, XLSX.SSF.parse_date_code);
      if (!valid.length) throw new Error("No valid rows (Driver Id, Name of Training and Date are required)");
      for (let i = 0; i < valid.length; i += 500) {
        const { error } = await (supabase as any).from("driver_trainings").insert(valid.slice(i, i + 500).map((r) => ({ ...r, uploaded_by: user.id })));
        if (error) throw error;
      }
      toast.success(`Uploaded ${valid.length} trainings${skipped ? `, skipped ${skipped} incomplete rows` : ""}`);
      await fetchRows();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const mark = async (row: TrainingRow, attendance: "present" | "absent" | "pending") => {
    const patch = { attendance, marked_by: user?.id ?? null, marked_at: new Date().toISOString() };
    const { error } = await (supabase as any).from("driver_trainings").update(patch).eq("id", row.id);
    if (error) return toast.error("Could not update attendance");
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
  };

  const remove = async (row: TrainingRow) => {
    if (!confirm(`Delete training for ${row.driver_id}?`)) return;
    const { error } = await (supabase as any).from("driver_trainings").delete().eq("id", row.id);
    if (error) return toast.error("Delete failed");
    setRows((rs) => rs.filter((r) => r.id !== row.id));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (filter === "all" || r.attendance === filter) &&
      (!q || [r.driver_id, r.driver_name, r.training_name, r.room_no].some((v) => (v || "").toLowerCase().includes(q))));
  }, [rows, search, filter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const counts = { total: rows.length, present: rows.filter((r) => r.attendance === "present").length, absent: rows.filter((r) => r.attendance === "absent").length };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map((r) => ({ "Driver Id": r.driver_id, Name: r.driver_name, "Name of Training": r.training_name, Date: r.training_date, Time: r.training_time, "Room No": r.room_no, Attendance: r.attendance })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trainings");
    XLSX.writeFile(wb, "driver-trainings.xlsx");
  };

  return (
    <PageLayout title="Drivers Training" icon={<GraduationCap className="w-6 h-6" />}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[["Total", counts.total], ["Present", counts.present], ["Absent", counts.absent]].map(([l, v]) => (
            <Card key={l as string}><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{v}</div><div className="text-sm text-muted-foreground">{l}</div></CardContent></Card>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (<>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleUpload} />
            <Button className="min-h-11" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Upload Excel
            </Button>
            <Button variant="outline" className="min-h-11" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" />Template</Button>
          </>)}
          <Button variant="outline" className="min-h-11" onClick={exportExcel}><Download className="w-4 h-4 mr-2" />Export Excel</Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 min-h-11" placeholder="Search Driver ID, name, training, room..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="min-h-11 rounded-md border bg-background px-3" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
            <option value="all">All</option><option value="pending">Pending</option><option value="present">Present</option><option value="absent">Absent</option>
          </select>
        </div>
        {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> :
          shown.length === 0 ? <p className="text-center text-muted-foreground py-10">No trainings found.</p> : (
          <div className="space-y-2">
            {shown.map((r) => (
              <Card key={r.id}><CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{r.driver_id}{r.driver_name ? ` — ${r.driver_name}` : ""}</div>
                  <div className="text-sm">{r.training_name}</div>
                  <div className="text-xs text-muted-foreground">{r.training_date}{r.training_time ? ` · ${r.training_time}` : ""}{r.room_no ? ` · Room ${r.room_no}` : ""}</div>
                </div>
                <AttendanceBadge value={r.attendance} />
                <div className="flex gap-2">
                  <Button size="sm" className="min-h-11" variant={r.attendance === "present" ? "default" : "outline"} onClick={() => mark(r, r.attendance === "present" ? "pending" : "present")}><Check className="w-4 h-4 mr-1" />Present</Button>
                  <Button size="sm" className="min-h-11" variant={r.attendance === "absent" ? "destructive" : "outline"} onClick={() => mark(r, r.attendance === "absent" ? "pending" : "absent")}><X className="w-4 h-4 mr-1" />Absent</Button>
                  {isAdmin && <Button size="sm" variant="ghost" className="min-h-11" aria-label="Delete" onClick={() => remove(r)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
            <span className="text-sm">Page {page} of {pages}</span>
            <Button variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default AdminDriverTrainingPage;
