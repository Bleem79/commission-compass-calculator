import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { GraduationCap, Upload, Download, Trash2, Loader2, Search, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageLayout } from "@/components/shared/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrainingAttendance, TrainingDate, TrainingDetails, TrainingSummary, TrainingEmpty } from "@/components/shared/TrainingPresentation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseTrainingRows, type TrainingRow } from "@/utils/driverTraining";
import { attendanceTemplateRows, prepareAttendanceUpload, type AttendancePreview } from "@/utils/trainingAttendance";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const PAGE_SIZE = 15;

const AdminDriverTrainingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const attendanceFileRef = useRef<HTMLInputElement>(null);
  const [attendancePreview, setAttendancePreview] = useState<AttendancePreview | null>(null);
  const [savingAttendance, setSavingAttendance] = useState(false);
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

  const downloadAttendanceTemplate = () => {
    const data = attendanceTemplateRows(filtered);
    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ "Training ID": "", "Driver Id": "", Name: "", "Name of Training": "", Date: "", Time: "", "Room No": "", Attendance: "" }]);
    ws["!cols"] = [38, 14, 28, 50, 16, 16, 16, 18].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    const instructions = XLSX.utils.aoa_to_sheet([["Attendance upload"], ["Enter Present or Absent in Attendance. Remove rows you do not want to update."], ["Keep Training ID and Driver Id unchanged to match the exact schedule."], ["Without Training ID, Driver Id + Name of Training + Date must match one existing schedule."], ["This template contains the currently filtered training records."]]);
    instructions["!cols"] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, instructions, "Instructions");
    XLSX.writeFile(wb, "driver-training-attendance-template.xlsx");
  };

  const handleAttendanceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) throw new Error("No worksheet found");
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      if (!raw.length) throw new Error("The attendance file is empty");
      setAttendancePreview(prepareAttendanceUpload(raw, rows, XLSX.SSF.parse_date_code));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read attendance file");
    } finally {
      if (attendanceFileRef.current) attendanceFileRef.current.value = "";
    }
  };

  const saveAttendanceUpload = async () => {
    if (!attendancePreview || !isAdmin || !user?.id) return;
    setSavingAttendance(true);
    const failures: typeof attendancePreview.updates = [];
    let saved = 0;
    try {
      for (let offset = 0; offset < attendancePreview.updates.length; offset += 10) {
        const batch = attendancePreview.updates.slice(offset, offset + 10);
        const results = await Promise.allSettled(batch.map(async (r) => {
          const { data, error } = await supabase.from("driver_trainings").update({ attendance: r.attendance, marked_by: user.id, marked_at: new Date().toISOString() }).eq("id", r.id).eq("driver_id", r.driver_id).select("id");
          if (error || data?.length !== 1) throw new Error("Attendance update failed");
        }));
        results.forEach((result, i) => { if (result.status === "fulfilled") saved++; else failures.push(batch[i]); });
      }
      if (saved) toast.success(`Updated attendance for ${saved} training records`);
      if (failures.length) {
        toast.error(`${failures.length} updates failed. Retry the remaining records.`);
        setAttendancePreview({ updates: failures, issues: attendancePreview.issues });
      } else setAttendancePreview(null);
      await fetchRows();
    } finally { setSavingAttendance(false); }
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
    <PageLayout title="Drivers Training" icon={<GraduationCap className="w-6 h-6 text-primary" />} gradient="from-background to-background">
      <div className="space-y-6">
        <TrainingSummary total={counts.total} present={counts.present} absent={counts.absent} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Training register</h2>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (<>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleUpload} />
              <Button className="min-h-11" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />}Upload Excel
              </Button>
              <Button variant="outline" className="min-h-11" onClick={downloadTemplate}><Download />Template</Button>
            </>)}
            <Button variant="outline" className="min-h-11" onClick={exportExcel}><Download />Export Excel</Button>
          </div>
        </div>
        {isAdmin && <div className="flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">Bulk attendance</h2>
          <div className="flex flex-wrap gap-2">
            <input ref={attendanceFileRef} type="file" aria-label="Attendance Excel file" accept=".xlsx,.xls,.csv" hidden onChange={handleAttendanceUpload} />
            <Button variant="outline" className="min-h-11" onClick={() => attendanceFileRef.current?.click()} disabled={loading || uploading || savingAttendance}><Upload />Upload Attendance</Button>
            <Button variant="outline" className="min-h-11" onClick={downloadAttendanceTemplate} disabled={loading}><Download />Attendance Template</Button>
          </div>
        </div>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input aria-label="Search trainings" className="pl-10 min-h-11 bg-card" placeholder="Search Driver ID, name, training, room..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={filter} onValueChange={(value) => { setFilter(value); setPage(1); }}>
            <SelectTrigger aria-label="Attendance filter" className="min-h-11 bg-card sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All attendance</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="present">Present</SelectItem><SelectItem value="absent">Absent</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
          <span className="font-medium">{filtered.length.toLocaleString("en-US")} training records</span>
          <span className="text-muted-foreground">Page {page} of {pages}</span>
        </div>
        {loading ? <div role="status" aria-label="Loading trainings" className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
          shown.length === 0 ? <TrainingEmpty /> : (
          <div className="space-y-3">
            {shown.map((r) => (
              <Card key={r.id} className="rounded-lg shadow-none"><CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="hidden sm:block"><TrainingDate date={r.training_date} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 text-xs font-semibold text-primary">Driver ID · {r.driver_id}</div>
                        <h3 className="break-words font-semibold">{r.driver_name || r.driver_id}</h3>
                      </div>
                      <TrainingAttendance value={r.attendance} />
                    </div>
                    <p className="mt-2 break-words text-sm font-medium text-foreground">{r.training_name}</p>
                    <div className="mt-3"><TrainingDetails row={r} /></div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                  <span className="mr-auto hidden text-xs text-muted-foreground sm:inline">Attendance</span>
                  <Button size="sm" className="min-h-11 flex-1 sm:flex-none" aria-pressed={r.attendance === "present"} variant={r.attendance === "present" ? "default" : "outline"} onClick={() => mark(r, r.attendance === "present" ? "pending" : "present")}><Check />Present</Button>
                  <Button size="sm" className="min-h-11 flex-1 sm:flex-none" aria-pressed={r.attendance === "absent"} variant={r.attendance === "absent" ? "destructive" : "outline"} onClick={() => mark(r, r.attendance === "absent" ? "pending" : "absent")}><X />Absent</Button>
                  {isAdmin && <Button size="icon" variant="ghost" className="h-11 w-11 text-destructive" title="Delete training" aria-label={`Delete training for ${r.driver_id}`} onClick={() => remove(r)}><Trash2 /></Button>}
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Button variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft />Prev</Button>
            <span className="text-sm text-muted-foreground">{page} / {pages}</span>
            <Button variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next<ChevronRight /></Button>
          </div>
        )}
      </div>
      <Dialog open={attendancePreview !== null} onOpenChange={(open) => { if (!open && !savingAttendance) setAttendancePreview(null); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto bg-card text-card-foreground sm:max-w-2xl">
          <DialogHeader><DialogTitle>Attendance upload preview</DialogTitle><DialogDescription>Only matching existing training records will be updated. No new schedules will be created.</DialogDescription></DialogHeader>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <span>{attendancePreview?.updates.length ?? 0} matched</span>
            <span className="text-primary">{attendancePreview?.updates.filter((r) => r.attendance === "present").length ?? 0} Present</span>
            <span className="text-destructive">{attendancePreview?.updates.filter((r) => r.attendance === "absent").length ?? 0} Absent</span>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {attendancePreview?.updates.map((r) => <div key={r.id} className="flex items-start justify-between gap-3 border-b border-border py-2 text-sm"><div className="min-w-0"><div className="font-semibold">{r.driver_id}</div><div className="break-words">{r.training_name}</div></div><TrainingAttendance value={r.attendance} /></div>)}
          </div>
          {!!attendancePreview?.issues.length && <div className="text-sm"><h3 className="mb-2 font-semibold text-destructive">{attendancePreview.issues.length} skipped rows</h3><ul className="max-h-32 space-y-1 overflow-y-auto">{attendancePreview.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></div>}
          <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" className="min-h-11" disabled={savingAttendance} onClick={() => setAttendancePreview(null)}>Cancel</Button><Button className="min-h-11" disabled={savingAttendance || !attendancePreview?.updates.length} onClick={saveAttendanceUpload}>{savingAttendance ? <Loader2 className="animate-spin" /> : <Check />}Save Attendance</Button></div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default AdminDriverTrainingPage;
