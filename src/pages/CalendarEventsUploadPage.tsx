import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { CalendarDays, Upload, Trash2, Download, FileSpreadsheet, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageLayout } from "@/components/shared/PageLayout";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ParsedEvent {
  event_date: string; // ISO YYYY-MM-DD
  event_name: string;
  address: string | null;
  maps_link: string | null;
  rawDate: string;
}

interface EventRow {
  id: string;
  event_date: string;
  event_name: string;
  address: string | null;
  maps_link: string | null;
  uploaded_filename: string | null;
  created_at: string;
}

interface HistoryRow {
  id: string;
  filename: string | null;
  record_count: number;
  action: string;
  created_at: string;
}

const REQUIRED_COLS = ["Date", "Events Name", "Address", "Location map"] as const;

const parseDDMMYYYY = (input: unknown): string | null => {
  if (input === null || input === undefined || input === "") return null;
  // Excel serial date
  if (typeof input === "number") {
    const utc = XLSX.SSF.parse_date_code(input);
    if (utc) {
      const d = new Date(Date.UTC(utc.y, (utc.m || 1) - 1, utc.d || 1));
      return format(d, "yyyy-MM-dd");
    }
    return null;
  }
  const s = String(input).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(d.getTime())) return null;
    return format(d, "yyyy-MM-dd");
  }
  // Already ISO
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  }
  return null;
};

const CalendarEventsUploadPage = () => {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsed, setParsed] = useState<ParsedEvent[]>([]);
  const [filename, setFilename] = useState<string>("");
  const [skipped, setSkipped] = useState<{ row: number; reason: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: ev }, { data: hist }] = await Promise.all([
      supabase.from("calendar_events").select("*").order("event_date", { ascending: true }),
      supabase.from("calendar_events_upload_history").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setEvents((ev as EventRow[]) || []);
    setHistory((hist as HistoryRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Date", "Events Name", "Address", "Location map"],
      ["25/12/2025", "Christmas Event", "Al Majaz Waterfront, Sharjah", "https://maps.google.com/?q=Sharjah"],
      ["01/01/2026", "New Year Gathering", "Aman Taxi HQ, Industrial 13, Sharjah", "https://maps.app.goo.gl/example"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Events");
    XLSX.writeFile(wb, "calendar_events_template.xlsx");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("Invalid file type. Please upload an Excel or CSV file.");
      e.target.value = "";
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      if (rows.length === 0) {
        toast.error("File contains no data rows.");
        e.target.value = "";
        return;
      }
      // Column header validation (case-insensitive)
      const keys = Object.keys(rows[0]);
      const lower = keys.map((k) => k.toLowerCase().trim());
      const missing = REQUIRED_COLS.filter((c) => !lower.includes(c.toLowerCase()));
      if (missing.length) {
        toast.error(`Missing required columns: ${missing.join(", ")}`);
        e.target.value = "";
        return;
      }
      const findKey = (target: string) => keys[lower.indexOf(target.toLowerCase())];
      const dateKey = findKey("Date");
      const nameKey = findKey("Events Name");
      const addressKey = findKey("Address");
      const linkKey = findKey("Location map");

      const skips: { row: number; reason: string }[] = [];
      const out: ParsedEvent[] = [];
      rows.forEach((r, idx) => {
        const rawDate = String(r[dateKey] ?? "").trim();
        const name = String(r[nameKey] ?? "").trim();
        const address = String(r[addressKey] ?? "").trim();
        const link = String(r[linkKey] ?? "").trim();
        if (!rawDate || !name) {
          skips.push({ row: idx + 2, reason: "Missing Date or Events Name" });
          return;
        }
        const iso = parseDDMMYYYY(r[dateKey]);
        if (!iso) {
          skips.push({ row: idx + 2, reason: `Invalid date "${rawDate}" (expected DD/MM/YYYY)` });
          return;
        }
        out.push({ event_date: iso, event_name: name, address: address || null, maps_link: link || null, rawDate });
      });
      setParsed(out);
      setSkipped(skips);
      setFilename(file.name);
      toast.success(`Parsed ${out.length} valid event${out.length === 1 ? "" : "s"}${skips.length ? `, ${skips.length} skipped` : ""}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to read file.");
    } finally {
      e.target.value = "";
    }
  };

  const handleUpload = async () => {
    if (!user?.id) {
      toast.error("You must be signed in.");
      return;
    }
    if (parsed.length === 0) {
      toast.error("Nothing to upload.");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const payload = parsed.map((p) => ({
        event_date: p.event_date,
        event_name: p.event_name,
        address: p.address,
        maps_link: p.maps_link,
        uploaded_by: user.id,
        uploaded_filename: filename,
      })) as any;
      const chunkSize = 250;
      let inserted = 0;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from("calendar_events").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
        setProgress(Math.round((inserted / payload.length) * 100));
      }
      await supabase.from("calendar_events_upload_history").insert({
        filename,
        record_count: inserted,
        action: "upload",
        performed_by: user.id,
      });
      toast.success(`Uploaded ${inserted} event${inserted === 1 ? "" : "s"}.`);
      setParsed([]);
      setFilename("");
      setSkipped([]);
      await fetchAll();
    } catch (err: any) {
      toast.error(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDeleteAll = async () => {
    if (!user?.id) return;
    const count = events.length;
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("calendar_events_upload_history").insert({
      filename: null,
      record_count: count,
      action: "delete_all",
      performed_by: user.id,
    });
    toast.success(`Deleted ${count} event${count === 1 ? "" : "s"}.`);
    await fetchAll();
  };

  const handleDeleteByFilename = async (name: string) => {
    if (!user?.id) return;
    const matching = events.filter((e) => e.uploaded_filename === name).length;
    const { error } = await supabase.from("calendar_events").delete().eq("uploaded_filename", name);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("calendar_events_upload_history").insert({
      filename: name,
      record_count: matching,
      action: "delete_file",
      performed_by: user.id,
    });
    toast.success(`Deleted ${matching} event${matching === 1 ? "" : "s"} from "${name}".`);
    await fetchAll();
  };

  const filenames = useMemo(() => {
    const set = new Map<string, number>();
    events.forEach((e) => {
      if (e.uploaded_filename) set.set(e.uploaded_filename, (set.get(e.uploaded_filename) || 0) + 1);
    });
    return Array.from(set.entries());
  }, [events]);

  if (!isAdmin) {
    return (
      <PageLayout title="Calendar Events" icon={<CalendarDays className="w-6 h-6" />}>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Admin access required.
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Calendar Events"
      icon={<CalendarDays className="w-6 h-6" />}
      backPath="/home"
      maxWidth="6xl"
    >
      <div className="space-y-6">
        {/* Upload card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="cal-events-file"
                  disabled={uploading}
                />
                <Button asChild variant="secondary" disabled={uploading}>
                  <label htmlFor="cal-events-file" className="cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Select File
                  </label>
                </Button>
              </label>
              {filename && (
                <span className="text-sm text-muted-foreground truncate max-w-[260px]">
                  {filename} — {parsed.length} ready
                </span>
              )}
              {parsed.length > 0 && (
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Uploading…" : `Import ${parsed.length} Events`}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Required columns: <strong>Date</strong>, <strong>Events Name</strong>,{" "}
              <strong>Address</strong>, <strong>Location map</strong>. Date format:{" "}
              <strong>DD/MM/YYYY</strong>.
            </p>

            {uploading && <Progress value={progress} />}

            {skipped.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-800 mb-1">
                  {skipped.length} row{skipped.length === 1 ? "" : "s"} skipped
                </p>
                <ul className="list-disc pl-5 text-amber-700 max-h-32 overflow-auto">
                  {skipped.slice(0, 10).map((s, i) => (
                    <li key={i}>
                      Row {s.row}: {s.reason}
                    </li>
                  ))}
                  {skipped.length > 10 && <li>…and {skipped.length - 10} more</li>}
                </ul>
              </div>
            )}

            {parsed.length > 0 && (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Event Name</th>
                      <th className="text-left p-2">Google Maps Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 5).map((p, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">
                          {format(new Date(p.event_date + "T00:00:00"), "dd/MM/yyyy")}
                        </td>
                        <td className="p-2">{p.event_name}</td>
                        <td className="p-2 truncate max-w-[280px]">
                          {p.maps_link || <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 5 && (
                  <p className="p-2 text-xs text-muted-foreground">
                    Showing 5 of {parsed.length} parsed rows.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Current Events ({events.length})</CardTitle>
            <div className="flex flex-wrap gap-2">
              {filenames.map(([name, count]) => (
                <AlertDialog key={name}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Remove "{name}" ({count})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete events from this file?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes all {count} event(s) uploaded from "{name}". A history record
                        will be kept.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteByFilename(name)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ))}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={events.length === 0}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete ALL calendar events?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all {events.length} event(s). A history record will be kept
                      with the timestamp and record count.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll}>Delete All</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-6">Loading…</p>
            ) : events.length === 0 ? (
              <EmptyState
                title="No events yet"
                description="Upload an Excel file with Date, Event Name, and Google Maps Link to get started."
              />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Event Name</th>
                      <th className="text-left p-2">Google Maps Link</th>
                      <th className="text-left p-2">File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr key={e.id} className="border-t hover:bg-muted/40">
                        <td className="p-2 whitespace-nowrap">
                          {format(new Date(e.event_date + "T00:00:00"), "dd/MM/yyyy")}
                        </td>
                        <td className="p-2">{e.event_name}</td>
                        <td className="p-2 truncate max-w-[320px]">
                          {e.maps_link ? (
                            <a
                              href={e.maps_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              {e.maps_link}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground truncate max-w-[200px]">
                          {e.uploaded_filename || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" /> Upload & Delete History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Timestamp</th>
                      <th className="text-left p-2">Action</th>
                      <th className="text-left p-2">Filename</th>
                      <th className="text-right p-2">Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">
                          {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="p-2 capitalize">{h.action.replace("_", " ")}</td>
                        <td className="p-2 truncate max-w-[260px]">{h.filename || "—"}</td>
                        <td className="p-2 text-right">{h.record_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default CalendarEventsUploadPage;