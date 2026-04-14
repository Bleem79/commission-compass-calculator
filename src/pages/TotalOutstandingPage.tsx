import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/shared/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileSpreadsheet, Upload, Download, Trash2, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface OutstandingRecord {
  id: string;
  emp_cde: string;
  fleet_status: string | null;
  accident: number;
  traffic_fines: number;
  shj_rta_fines: number;
  total_external_fines: number;
  total_outstanding: number;
  created_at: string;
}

const CHUNK_SIZE = 250;
const chunkArray = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const TotalOutstandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user, canAccessAdminPages } = useAuth();
  const [records, setRecords] = useState<OutstandingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; uploaded: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [driverInfo, setDriverInfo] = useState<{ driverId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStaff = isAdmin || canAccessAdminPages;

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  // Resolve driver ID for non-admin users
  useEffect(() => {
    const fetchDriverInfo = async () => {
      if (!isAuthenticated || isStaff) return;
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const actualUserId = authUser?.id || user?.id;
      const actualEmail = (authUser?.email || user?.email || "").toLowerCase();
      if (!actualUserId) return;

      const driverIdFromEmail = actualEmail.endsWith("@driver.temp") ? actualEmail.split("@")[0].trim() : null;
      if (driverIdFromEmail) {
        const { data: credentialRows } = await supabase.rpc("get_driver_credentials", { p_driver_id: driverIdFromEmail, p_user_id: actualUserId });
        const credentials = credentialRows && credentialRows.length > 0 ? credentialRows[0] : null;
        if (credentials?.driver_id) { setDriverInfo({ driverId: credentials.driver_id }); return; }
      }

      const { data } = await supabase.from("driver_credentials").select("driver_id").eq("user_id", actualUserId).maybeSingle();
      if (data?.driver_id) setDriverInfo({ driverId: data.driver_id });
    };
    fetchDriverInfo();
  }, [isAuthenticated, isStaff, user?.id, user?.email]);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const PAGE_SIZE = 1000;
      let all: OutstandingRecord[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        let query = supabase
          .from("total_outstanding")
          .select("*")
          .order("created_at", { ascending: false });

        // Non-admin: filter by their driver ID
        if (!isStaff && driverInfo?.driverId) {
          query = query.eq("emp_cde", driverInfo.driverId);
        }

        const { data, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) { console.error(error); break; }
        if (data && data.length > 0) { all = [...all, ...data]; hasMore = data.length === PAGE_SIZE; page++; }
        else hasMore = false;
      }
      setRecords(all);
    } finally { setIsLoading(false); }
  }, [isStaff, driverInfo?.driverId]);

  useEffect(() => { if (isAuthenticated) fetchRecords(); }, [fetchRecords, isAuthenticated]);

  const downloadTemplate = () => {
    const csvContent = `Emp Cde,Fleet Status,Accident,Traffic Fines,SHJ RTA Fines,Total External Fines,Total Outstanding
114291,OnRoad,0.00,3498.48,1488.62,4987.10,5363.40`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "total_outstanding_template.csv";
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template downloaded");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    const validExts = [".xlsx", ".xls", ".csv"];
    if (!validExts.some(ext => file.name.toLowerCase().endsWith(ext))) {
      toast.error("Please upload an Excel or CSV file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(null);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (!rows.length) { toast.error("No data found in file"); return; }

      // Normalize column headers
      const normalize = (s: string) => s.replace(/[^a-z0-9]/gi, "").toLowerCase();
      const colMap: Record<string, string> = {};
      const firstRow = rows[0];
      for (const key of Object.keys(firstRow)) {
        const n = normalize(key);
        if (n.includes("empcde") || n === "empcode" || n === "employeecode") colMap[key] = "emp_cde";
        else if (n.includes("fleetstatus")) colMap[key] = "fleet_status";
        else if (n === "accident") colMap[key] = "accident";
        else if (n.includes("trafficfine")) colMap[key] = "traffic_fines";
        else if (n.includes("shjrtafine")) colMap[key] = "shj_rta_fines";
        else if (n.includes("totalexternalfine")) colMap[key] = "total_external_fines";
        else if (n.includes("totaloutstanding")) colMap[key] = "total_outstanding";
      }

      if (!Object.values(colMap).includes("emp_cde")) {
        toast.error("Missing required column: Emp Cde");
        return;
      }

      const insertData = rows.map(row => {
        const mapped: any = {};
        for (const [orig, target] of Object.entries(colMap)) {
          mapped[target] = row[orig];
        }
        const parseNum = (v: any) => {
          if (v == null || v === "") return 0;
          const n = parseFloat(String(v).replace(/,/g, ""));
          return isNaN(n) ? 0 : n;
        };
        return {
          emp_cde: String(mapped.emp_cde || "").trim(),
          fleet_status: mapped.fleet_status ? String(mapped.fleet_status).trim() : null,
          accident: parseNum(mapped.accident),
          traffic_fines: parseNum(mapped.traffic_fines),
          shj_rta_fines: parseNum(mapped.shj_rta_fines),
          total_external_fines: parseNum(mapped.total_external_fines),
          total_outstanding: parseNum(mapped.total_outstanding),
          uploaded_by: user.id,
        };
      }).filter(r => r.emp_cde);

      if (!insertData.length) { toast.error("No valid rows found"); return; }

      setUploadProgress({ total: insertData.length, uploaded: 0 });
      const chunks = chunkArray(insertData, CHUNK_SIZE);
      for (const chunk of chunks) {
        const { error } = await supabase.from("total_outstanding").insert(chunk as any);
        if (error) { console.error(error); throw error; }
        setUploadProgress(prev => prev ? { total: prev.total, uploaded: prev.uploaded + chunk.length } : null);
      }

      toast.success(`Imported ${insertData.length} records`);
      fetchRecords();
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("total_outstanding").delete().gte("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("All records deleted");
      setRecords([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    } finally { setIsDeleting(false); }
  };

  const handleExport = () => {
    if (!filteredRecords.length) { toast.error("No data to export"); return; }
    const exportData = filteredRecords.map(r => ({
      "Emp Cde": r.emp_cde,
      "Fleet Status": r.fleet_status || "",
      "Accident": r.accident,
      "Traffic Fines": r.traffic_fines,
      "SHJ RTA Fines": r.shj_rta_fines,
      "Total External Fines": r.total_external_fines,
      "Total Outstanding": r.total_outstanding,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Total Outstanding");
    XLSX.writeFile(wb, "total_outstanding.xlsx");
    toast.success("Exported to Excel");
  };

  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.emp_cde.toLowerCase().includes(q) || (r.fleet_status || "").toLowerCase().includes(q);
  });

  const backPath = isStaff ? "/home" : "/driver-portal";

  return (
    <PageLayout
      title={isStaff ? "Total Outstanding" : "My Outstanding"}
      icon={<FileSpreadsheet className="h-6 w-6" />}
      backPath={backPath}
      backLabel={isStaff ? "Back to Home" : "Back to Portal"}
      gradient="from-background via-amber-50/50 to-orange-100/50"
      headerActions={
        isStaff && user?.id ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting || !records.length} className="flex items-center gap-2">
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all records?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently remove all Total Outstanding records.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll}>Delete All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : undefined
      }
    >
      {/* Upload Section - Admin Only */}
      {isStaff && user?.id && (
        <div className="mb-6 bg-card rounded-lg border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Upload Data</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
              <Download className="h-4 w-4" /> Download Template
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" id="outstanding-upload" />
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => document.getElementById("outstanding-upload")?.click()}
              className="flex items-center gap-2"
            >
              {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4" /> Upload Excel/CSV</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Columns: Emp Cde, Fleet Status, Accident, Traffic Fines, SHJ RTA Fines, Total External Fines, Total Outstanding
          </p>
          {uploadProgress && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading…</span>
                <span>{uploadProgress.uploaded}/{uploadProgress.total}</span>
              </div>
              <Progress value={uploadProgress.total > 0 ? Math.round((uploadProgress.uploaded / uploadProgress.total) * 100) : 0} />
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Emp Code or Fleet Status..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 pr-8"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-card rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Records</p>
          <p className="text-lg font-bold">{filteredRecords.length}</p>
        </div>
        <div className="bg-card rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Accidents</p>
          <p className="text-lg font-bold">{filteredRecords.reduce((s, r) => s + r.accident, 0).toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Ext. Fines</p>
          <p className="text-lg font-bold text-red-600">{filteredRecords.reduce((s, r) => s + r.total_external_fines, 0).toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Outstanding</p>
          <p className="text-lg font-bold text-red-600">{filteredRecords.reduce((s, r) => s + r.total_outstanding, 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emp Cde</TableHead>
              <TableHead>Fleet Status</TableHead>
              <TableHead className="text-right">Accident</TableHead>
              <TableHead className="text-right">Traffic Fines</TableHead>
              <TableHead className="text-right">SHJ RTA Fines</TableHead>
              <TableHead className="text-right text-red-600 font-semibold">Total External Fines</TableHead>
              <TableHead className="text-right text-red-600 font-semibold">Total Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
            ) : (
              filteredRecords.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.emp_cde}</TableCell>
                  <TableCell>{r.fleet_status || "-"}</TableCell>
                  <TableCell className="text-right">{r.accident.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{r.traffic_fines.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{r.shj_rta_fines.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">{r.total_external_fines.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">{r.total_outstanding.toFixed(2)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageLayout>
  );
};

export default TotalOutstandingPage;
