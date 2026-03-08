import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Download, Upload, Loader2, FileWarning, FileSpreadsheet, Trash2, History, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BookingRejectionRow {
  month: string;
  driver_id: string;
  driver_name: string;
  offer: string;
  accept: string;
  reject: string;
}

interface UploadHistoryRecord {
  id: string;
  date: string;
  driver_id: string;
  name: string | null;
  action_taken: string;
  reasons: string | null;
  created_at: string;
}

const CHUNK_SIZE = 250;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const chunkArray = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const formatMonth = (dateStr: string): string => {
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return `${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const FULL_MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const SHORT_MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const monthToDate = (raw: string): string => {
  const s = raw.trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(s)) return s + "-01";

  // "Mon-YYYY" e.g. "Feb-2026" or "Mon YYYY"
  const shortMatch = s.match(/^([A-Za-z]{3})[- ](\d{4})$/);
  if (shortMatch) {
    const idx = SHORT_MONTH_NAMES.indexOf(shortMatch[1].toLowerCase());
    if (idx !== -1) return `${shortMatch[2]}-${String(idx + 1).padStart(2, '0')}-01`;
  }

  // Full month name e.g. "February" or "February 2026" or "February-2026"
  const fullMatch = s.match(/^([A-Za-z]+)(?:[- ](\d{4}))?$/);
  if (fullMatch) {
    const idx = FULL_MONTH_NAMES.indexOf(fullMatch[1].toLowerCase());
    if (idx !== -1) {
      const year = fullMatch[2] || new Date().getFullYear().toString();
      return `${year}-${String(idx + 1).padStart(2, '0')}-01`;
    }
  }

  // Fallback: try to parse and format
  try {
    const d = new Date(s + "T00:00:00");
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}

  // Last resort: return first day of current month
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const parseActionTaken = (action: string) => {
  const parts = action.split("|");
  let offer = 0, accept = 0, reject = 0;
  parts.forEach(p => {
    const [key, val] = p.split(":");
    const num = parseInt(val, 10) || 0;
    if (key?.trim().toLowerCase() === "offer") offer = num;
    else if (key?.trim().toLowerCase() === "accept") accept = num;
    else if (key?.trim().toLowerCase() === "reject") reject = num;
  });
  return { offer, accept, reject };
};

const WarningLettersUploadPage = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BookingRejectionRow[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; uploaded: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload history state
  const [historyRecords, setHistoryRecords] = useState<UploadHistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home");
    }
  }, [isAdmin, navigate]);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("warning_letters")
        .select("id, date, driver_id, name, action_taken, reasons, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setHistoryRecords(data || []);
    } catch (err: any) {
      console.error("Error fetching history:", err);
      toast.error("Failed to load upload history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchHistory();
  }, [isAdmin, fetchHistory]);

  const downloadTemplate = () => {
    const csvContent = `Month,driverId,driverName,offer,accept,reject
January,112455,ABEDNEGO OSABUTEY,50,45,5
February,112214,SPENCER ASANTE,60,55,5
March,112112,MICHEAL MAWUKO,40,38,2`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "booking_rejection_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template downloaded");
  };

  const parseCSV = (text: string): BookingRejectionRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error("File must have at least a header row and one data row");
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const monthIdx = headers.findIndex(h => h === 'month');
    const driverIdIdx = headers.findIndex(h => h.includes('driverid') || h.includes('driver_id') || (h.includes('driver') && h.includes('id')));
    const driverNameIdx = headers.findIndex(h => h.includes('drivername') || h.includes('driver_name') || h === 'name');
    const offerIdx = headers.findIndex(h => h === 'offer');
    const acceptIdx = headers.findIndex(h => h === 'accept');
    const rejectIdx = headers.findIndex(h => h === 'reject');

    if (driverIdIdx === -1) throw new Error("CSV must contain 'driverId' column");

    const data: BookingRejectionRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2 || !values[driverIdIdx]) continue;
      data.push({
        month: monthIdx !== -1 ? values[monthIdx] : '',
        driver_id: values[driverIdIdx],
        driver_name: driverNameIdx !== -1 ? values[driverNameIdx] : '',
        offer: offerIdx !== -1 ? values[offerIdx] : '0',
        accept: acceptIdx !== -1 ? values[acceptIdx] : '0',
        reject: rejectIdx !== -1 ? values[rejectIdx] : '0',
      });
    }
    return data;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error("Please upload a CSV file"); return; }
    setSelectedFile(file);
    try {
      const text = await file.text();
      const data = parseCSV(text);
      setPreviewData(data.slice(0, 5));
      toast.success(`File loaded: ${data.length} row(s). Click "Import Booking Rejection" to save.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to parse file");
      setSelectedFile(null);
      setPreviewData(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) { toast.error("Please select a file"); return; }
    setIsUploading(true);
    setUploadProgress(null);
    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);
      const insertData = data.map((row) => ({
        date: row.month,
        taxi_no: '',
        driver_id: row.driver_id,
        name: row.driver_name,
        reasons: `Offer: ${row.offer}, Accept: ${row.accept}, Reject: ${row.reject}`,
        action_taken: `Offer:${row.offer}|Accept:${row.accept}|Reject:${row.reject}`,
        document_no: '',
        uploaded_by: user.id,
      }));
      setUploadProgress({ total: insertData.length, uploaded: 0 });
      const chunks = chunkArray(insertData, CHUNK_SIZE);
      for (const chunk of chunks) {
        const { error } = await supabase.from("warning_letters").insert(chunk as any);
        if (error) throw error;
        setUploadProgress((prev) => {
          if (!prev) return { total: insertData.length, uploaded: chunk.length };
          return { total: prev.total, uploaded: prev.uploaded + chunk.length };
        });
      }
      toast.success(`Successfully imported ${insertData.length} booking rejection records`);
      setSelectedFile(null);
      setPreviewData(null);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchHistory();
    } catch (error: any) {
      console.error("Error uploading booking rejection:", error);
      toast.error(error.message || "Failed to upload booking rejection data");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === historyRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(historyRecords.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    setShowDeleteConfirm(false);
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const chunks = chunkArray(ids, 200);
      for (const chunk of chunks) {
        const { error } = await supabase
          .from("warning_letters")
          .delete()
          .in("id", chunk);
        if (error) throw error;
      }
      toast.success(`Deleted ${ids.length} record(s)`);
      setSelectedIds(new Set());
      fetchHistory();
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete records");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      // Delete all records (use a condition that matches everything)
      const { error } = await supabase
        .from("warning_letters")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("All booking rejection records deleted");
      setSelectedIds(new Set());
      fetchHistory();
    } catch (err: any) {
      console.error("Delete all error:", err);
      toast.error(err.message || "Failed to delete all records");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdmin) return null;

  const isAllSelected = historyRecords.length > 0 && selectedIds.size === historyRecords.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-amber-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")} className="hover:bg-orange-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-orange-800 flex items-center gap-3">
              <FileWarning className="h-8 w-8" />
              Booking Rejection Upload
            </h1>
            <p className="text-slate-600">Upload driver booking rejection data</p>
          </div>
        </div>

        {/* Upload Card */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Upload Booking Rejection Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={downloadTemplate} className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="file">CSV File</Label>
                <Input ref={fileInputRef} id="file" type="file" accept=".csv" onChange={handleFileChange} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Required: driverId | Optional: Month, driverName, offer, accept, reject</p>
              </div>
              <Button onClick={handleUpload} disabled={!selectedFile || isUploading} className="shrink-0 bg-orange-600 hover:bg-orange-700">
                {isUploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>) : (<><Upload className="h-4 w-4 mr-2" />Import Booking Rejection</>)}
              </Button>
            </div>
            {uploadProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Uploading records…</span>
                  <span>{uploadProgress.uploaded}/{uploadProgress.total}</span>
                </div>
                <Progress value={uploadProgress.total > 0 ? Math.round((uploadProgress.uploaded / uploadProgress.total) * 100) : 0} />
              </div>
            )}
            {previewData && previewData.length > 0 && (
              <div className="mt-4 bg-muted/50 rounded-lg p-4 overflow-x-auto">
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />Preview (first 5 rows)
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Month</th>
                      <th className="text-left p-2">Driver ID</th>
                      <th className="text-left p-2">Driver Name</th>
                      <th className="text-left p-2">Offer</th>
                      <th className="text-left p-2">Accept</th>
                      <th className="text-left p-2">Reject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="p-2">{row.month || '-'}</td>
                        <td className="p-2">{row.driver_id}</td>
                        <td className="p-2">{row.driver_name || '-'}</td>
                        <td className="p-2">{row.offer}</td>
                        <td className="p-2">{row.accept}</td>
                        <td className="p-2">{row.reject}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload History Card */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <History className="h-5 w-5" />
                Upload History ({historyRecords.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoadingHistory}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                    Delete Selected ({selectedIds.size})
                  </Button>
                )}
                {historyRecords.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedIds(new Set(historyRecords.map(r => r.id)));
                      setShowDeleteConfirm(true);
                    }}
                    disabled={isDeleting}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upload history found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-2 text-left w-10">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left p-2">Month</th>
                      <th className="text-left p-2">Driver ID</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Offer</th>
                      <th className="text-left p-2">Accept</th>
                      <th className="text-left p-2">Reject</th>
                      <th className="text-left p-2">Uploaded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((record) => {
                      const parsed = parseActionTaken(record.action_taken);
                      return (
                        <tr key={record.id} className={`border-b border-border ${selectedIds.has(record.id) ? 'bg-orange-50' : ''}`}>
                          <td className="p-2">
                            <Checkbox
                              checked={selectedIds.has(record.id)}
                              onCheckedChange={() => toggleSelect(record.id)}
                            />
                          </td>
                          <td className="p-2">{formatMonth(record.date)}</td>
                          <td className="p-2 font-mono">{record.driver_id}</td>
                          <td className="p-2">{record.name || '-'}</td>
                          <td className="p-2">{parsed.offer}</td>
                          <td className="p-2">{parsed.accept}</td>
                          <td className="p-2">{parsed.reject}</td>
                          <td className="p-2 text-muted-foreground">
                            {new Date(record.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Records</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} record(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={selectedIds.size === historyRecords.length ? handleDeleteAll : handleDeleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WarningLettersUploadPage;
