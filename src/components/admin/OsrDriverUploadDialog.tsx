
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Info, Upload, Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

interface OsrRecord {
  id: string;
  driver_id: string;
  status: string;
  created_at: string;
}

export const OsrDriverUploadDialog = ({ onOsrChange }: { onOsrChange?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<OsrRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("osr_drivers")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setRecords(data);
    setLoading(false);
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) fetchRecords();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload an Excel or CSV file");
      return;
    }

    setIsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        toast.error("No data found in file");
        setIsUploading(false);
        return;
      }

      // Normalize headers
      const normalized = rows.map((row) => {
        const keys = Object.keys(row);
        const driverIdKey = keys.find((k) => /driver.?id/i.test(k)) || keys[0];
        const statusKey = keys.find((k) => /status/i.test(k)) || keys[1];
        return {
          driver_id: String(row[driverIdKey]).trim(),
          status: statusKey ? String(row[statusKey]).trim() : "OSR",
        };
      }).filter((r) => r.driver_id);

      // Get current user email for uploaded_by
      const { data: { user } } = await supabase.auth.getUser();
      const uploadedBy = user?.user_metadata?.username || user?.email || "admin";

      // Upsert in batches
      let successCount = 0;
      const batchSize = 100;
      for (let i = 0; i < normalized.length; i += batchSize) {
        const batch = normalized.slice(i, i + batchSize).map((r) => ({
          driver_id: r.driver_id,
          status: r.status,
          uploaded_by: uploadedBy,
        }));
        const { error } = await supabase.from("osr_drivers").upsert(batch, { onConflict: "driver_id" });
        if (!error) successCount += batch.length;
      }

      // Auto-disable drivers with OSR status
      const osrDriverIds = normalized.filter((r) => r.status.toUpperCase() === "OSR").map((r) => r.driver_id);
      if (osrDriverIds.length > 0) {
        for (let i = 0; i < osrDriverIds.length; i += batchSize) {
          const batch = osrDriverIds.slice(i, i + batchSize);
          await supabase
            .from("driver_credentials")
            .update({ status: "disabled" })
            .in("driver_id", batch);
        }
      }

      toast.success(`${successCount} OSR records uploaded`, {
        description: `${osrDriverIds.length} drivers auto-disabled`,
      });

      fetchRecords();
      onOsrChange?.();
    } catch (err: any) {
      toast.error("Upload failed", { description: err.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    const { error } = await supabase.from("osr_drivers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast.error("Failed to clear records");
    } else {
      toast.success("All OSR records cleared");
      setRecords([]);
      onOsrChange?.();
    }
    setIsClearing(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs sm:text-sm" title="OSR Driver Upload">
          <Info className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">OSR Driver</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" /> OSR Driver Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="h-4 w-4 mr-2" />Upload OSR File</>}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isClearing || records.length === 0} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  {isClearing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />} Delete All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All OSR Records?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete all {records.length} OSR driver records.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">Yes, Delete All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>

            <Badge variant="secondary" className="ml-auto">{records.length} records</Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            Upload an Excel/CSV file with columns: <strong>Driver Id</strong>, <strong>Status</strong>. Drivers with "OSR" status will be auto-disabled.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No OSR records found</div>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.driver_id}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(r.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
