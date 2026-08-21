import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Loader2, Upload, Trash2, Download, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Row {
  id: string;
  s_no: number | null;
  driver_id: string;
  driver_name: string | null;
  gender: string | null;
  nationality: string | null;
  mobile_no: string | null;
  status: string | null;
  hr_status: string | null;
}

const PAGE_SIZE = 15;

const pick = (row: Record<string, unknown>, keys: string[]) => {
  for (const k of Object.keys(row)) {
    const norm = k.toLowerCase().replace(/[^a-z]/g, "");
    if (keys.includes(norm)) {
      const v = row[k];
      return v === null || v === undefined ? "" : String(v).trim();
    }
  }
  return "";
};

export const YangoDriverListDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const all: Row[] = [];
      let from = 0;
      const batch = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("yango_driver_list")
          .select("id, s_no, driver_id, driver_name, gender, nationality, mobile_no, status, hr_status")
          .order("s_no", { ascending: true })
          .range(from, from + batch - 1);
        if (error) throw error;
        const chunk = (data as Row[]) || [];
        all.push(...chunk);
        if (chunk.length < batch) break;
        from += batch;
      }
      setRows(all);
    } catch (err) {
      console.error("Error loading Yango driver list:", err);
      toast.error("Failed to load driver list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchRows();
  }, [open, fetchRows]);

  const handleTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "S.No": 1,
        "Driver Id": "100344",
        "Drvr Name": "SIRAJ MIAH MONIR HOSSAIN",
        Gender: "M",
        Nationality: "Bangladeshi",
        "Mobile No": "971502087454",
        Status: "OSR",
        "HR Status": "Resigned",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Drivers");
    XLSX.writeFile(wb, "yango-driver-list-template.xlsx");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const { data: userData } = await supabase.auth.getUser();

      const payload = raw
        .map((r) => ({
          s_no: Number(pick(r, ["sno", "sn", "srno", "serialno"])) || null,
          driver_id: pick(r, ["driverid", "driverno", "empcde", "id"]),
          driver_name: pick(r, ["drvrname", "drivername", "name"]) || null,
          gender: pick(r, ["gender", "sex"]) || null,
          nationality: pick(r, ["nationality"]) || null,
          mobile_no: pick(r, ["mobileno", "mobile", "phone", "phoneno", "contactno"]) || null,
          status: pick(r, ["status"]) || null,
          hr_status: pick(r, ["hrstatus"]) || null,
          uploaded_by: userData.user?.id ?? null,
        }))
        .filter((r) => r.driver_id);

      if (payload.length === 0) {
        toast.error("No valid rows found. Check the column names.");
        return;
      }

      for (let i = 0; i < payload.length; i += 500) {
        const { error } = await supabase.from("yango_driver_list").insert(payload.slice(i, i + 500));
        if (error) throw error;
      }
      toast.success(`Uploaded ${payload.length} driver record${payload.length > 1 ? "s" : ""}.`);
      await fetchRows();
    } catch (err: unknown) {
      console.error("Yango driver list upload failed:", err);
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete all ${rows.length} uploaded driver records? This cannot be undone.`)) return;
    setClearing(true);
    const { error } = await supabase
      .from("yango_driver_list")
      .delete()
      .not("id", "is", null);
    setClearing(false);
    if (error) {
      toast.error(error.message || "Failed to delete records.");
      return;
    }
    setRows([]);
    toast.success("All driver records deleted.");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.driver_id.toLowerCase().includes(q) ||
        (r.driver_name || "").toLowerCase().includes(q) ||
        (r.mobile_no || "").toLowerCase().includes(q),
    );
  }, [rows, query]);

  useEffect(() => setPage(1), [query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yango — Driver List Upload</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" onClick={handleTemplate}>
            <Download className="w-4 h-4 mr-2" /> Template
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleUpload}
          />
          <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Upload Excel</>
            )}
          </Button>
          {rows.length > 0 && (
            <Button variant="destructive" disabled={clearing} onClick={handleDeleteAll}>
              {clearing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete All
            </Button>
          )}
          <div className="relative ml-auto w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search driver / mobile"
              className="pl-9"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Columns: S.No, Driver Id, Drvr Name, Gender, Nationality, Mobile No, Status, HR Status
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No driver records uploaded yet.
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden space-y-3">
              {paged.map((r, i) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold break-words">{r.driver_id}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      #{r.s_no ?? (page - 1) * PAGE_SIZE + i + 1}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground break-words">{r.driver_name || "—"}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {[
                      ["Gender", r.gender || "—"],
                      ["Nationality", r.nationality || "—"],
                      ["Mobile No", r.mobile_no || "—"],
                      ["Status", r.status || "—"],
                      ["HR Status", r.hr_status || "—"],
                    ].map(([label, value]) => (
                      <div key={label as string} className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="break-words">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto rounded-lg border">

              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left font-medium px-3 py-2">S.No</th>
                    <th className="text-left font-medium px-3 py-2">Driver Id</th>
                    <th className="text-left font-medium px-3 py-2">Drvr Name</th>
                    <th className="text-left font-medium px-3 py-2">Gender</th>
                    <th className="text-left font-medium px-3 py-2">Nationality</th>
                    <th className="text-left font-medium px-3 py-2">Mobile No</th>
                    <th className="text-left font-medium px-3 py-2">Status</th>
                    <th className="text-left font-medium px-3 py-2">HR Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r, i) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.s_no ?? (page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-3 py-2 font-medium">{r.driver_id}</td>
                      <td className="px-3 py-2">{r.driver_name || "—"}</td>
                      <td className="px-3 py-2">{r.gender || "—"}</td>
                      <td className="px-3 py-2">{r.nationality || "—"}</td>
                      <td className="px-3 py-2">{r.mobile_no || "—"}</td>
                      <td className="px-3 py-2">{r.status || "—"}</td>
                      <td className="px-3 py-2">{r.hr_status || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {filtered.length} record{filtered.length > 1 ? "s" : ""} • Page {page} of {totalPages}
              </span>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};