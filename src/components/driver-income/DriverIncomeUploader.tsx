import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { processDriverIncomeFile, DriverIncomeRow, SkippedRow } from "@/utils/excel/processDriverIncomeFile";

interface DriverIncomeUploaderProps {
  userId: string;
  onUploadSuccess: (heading: string) => void;
  reportHeading: string;
  onHeadingChange: (heading: string) => void;
}

const CHUNK_SIZE = 250;

const chunkArray = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const formatSupabaseError = (err: any) => {
  const parts = [err?.message, err?.details, err?.hint].filter(Boolean);
  return parts.join(" — ") || "Failed to upload driver income data";
};

export const DriverIncomeUploader = ({ 
  userId, 
  onUploadSuccess, 
  reportHeading, 
  onHeadingChange 
}: DriverIncomeUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<DriverIncomeRow[] | null>(null);
  const [skippedRows, setSkippedRows] = useState<SkippedRow[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; uploaded: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("Please upload an Excel or CSV file");
      return;
    }

    setSelectedFile(file);

    try {
      const result = await processDriverIncomeFile(file);
      setPreviewData(result.data.slice(0, 5));
      setSkippedRows(result.skipped.length > 0 ? result.skipped : null);
      
      if (result.skipped.length > 0) {
        toast.warning(`File loaded: ${result.data.length} valid row(s), ${result.skipped.length} row(s) skipped. Check details below.`);
      } else {
        toast.success(`File loaded: ${result.data.length} row(s). Click "Import Driver Income Data" to save.`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to parse file");
      setSelectedFile(null);
      setPreviewData(null);
      setSkippedRows(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }
    setIsUploading(true);
    setUploadProgress(null);

    try {
      const result = await processDriverIncomeFile(selectedFile);
      const data = result.data;

      // Extract month and year from heading or use current date
      const now = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      
      const insertData = data.map((row) => ({
        driver_id: row.driver_id,
        driver_name: row.driver_name,
        working_days: row.working_days,
        total_trips: row.total_trips,
        total_income: row.total_income,
        shift: row.shift,
        average_daily_income: row.average_daily_income,
        month: monthNames[now.getMonth()],
        year: now.getFullYear(),
        uploaded_by: userId,
      }));

      // Delete all existing driver income data before inserting new data
      const { error: deleteError } = await supabase.from("driver_income").delete().gte('id', '00000000-0000-0000-0000-000000000000');
      if (deleteError) {
        console.error("Error deleting existing data:", deleteError);
        throw deleteError;
      }
      console.log("All existing driver income data deleted successfully");

      setUploadProgress({ total: insertData.length, uploaded: 0 });

      const chunks = chunkArray(insertData, CHUNK_SIZE);
      for (const chunk of chunks) {
        const { error } = await supabase.from("driver_income").insert(chunk as any);
        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }

        setUploadProgress((prev) => {
          if (!prev) return { total: insertData.length, uploaded: chunk.length };
          return { total: prev.total, uploaded: prev.uploaded + chunk.length };
        });
      }

      // Save the report heading to settings
      const { data: existingSettings } = await supabase
        .from('driver_income_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existingSettings) {
        await supabase
          .from('driver_income_settings')
          .update({ report_heading: reportHeading, updated_at: new Date().toISOString(), updated_by: userId } as any)
          .eq('id', existingSettings.id);
      } else {
        await supabase
          .from('driver_income_settings')
          .insert({ report_heading: reportHeading, updated_by: userId } as any);
      }

      const skippedCount = result.skipped.length;
      if (skippedCount > 0) {
        toast.success(`Imported ${insertData.length} records. ${skippedCount} row(s) were skipped due to invalid data.`);
      } else {
        toast.success(`Successfully imported ${insertData.length} driver income records (previous data removed)`);
      }
      setSelectedFile(null);
      setPreviewData(null);
      setSkippedRows(null);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onUploadSuccess(reportHeading);
    } catch (error: any) {
      console.error("Error uploading driver income:", error);
      toast.error(formatSupabaseError(error));
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Driver ID,Driver Name,WrkDays,Total Trips,TotalIncome,Shift
100525,MUHAMMAD SIDDIQUE AMIR AHMED,5,84,1739.5,1- W/O Basic
100955,ABDUL ROUF POOMANGAL,5,132,2533,1- W/O Basic
101692,MOHAMMED JAFAR IQBAL ABDUL BASHAR,5,98,2192,1- W/O Basic
101709,NOOR MUHAMMAD KHAN,5,108,2034.75,1- W/O Basic
102141,GUL MUHAMMAD KHAN MUNASIB KHAN,5,102,2236.25,1- W/O Basic`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "driver_income_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template downloaded");
  };

  return (
    <div className="space-y-4">
      {/* Top row: Heading input on left, Download Template on right */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <Label htmlFor="report-heading">Report Heading (optional)</Label>
          <Input
            id="report-heading"
            type="text"
            placeholder="Enter report heading (optional)"
            value={reportHeading}
            onChange={(e) => onHeadingChange(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button
          variant="outline"
          onClick={downloadTemplate}
          className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 shrink-0"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* File input and Import button */}
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="file">Excel/CSV File</Label>
          <Input
            ref={fileInputRef}
            id="file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required: Driver ID, Driver Name, WrkDays, Total Trips, TotalIncome, Shift
          </p>
        </div>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="shrink-0"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import Driver Income Data
            </>
          )}
        </Button>
      </div>

      {/* Upload progress */}
      {uploadProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Uploading records…</span>
            <span>
              {uploadProgress.uploaded}/{uploadProgress.total}
            </span>
          </div>
          <Progress
            value={
              uploadProgress.total > 0
                ? Math.round((uploadProgress.uploaded / uploadProgress.total) * 100)
                : 0
            }
          />
        </div>
      )}

      {/* Skipped rows warning */}
      {skippedRows && skippedRows.length > 0 && (
        <div className="mt-4 bg-destructive/10 border border-destructive/30 rounded-lg p-4 overflow-x-auto">
          <h4 className="text-sm font-medium text-destructive mb-2">
            ⚠️ Skipped Rows ({skippedRows.length})
          </h4>
          <p className="text-xs text-muted-foreground mb-2">
            The following rows will NOT be imported due to missing or invalid data:
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-destructive/30">
                <th className="text-left p-2">Row #</th>
                <th className="text-left p-2">Driver ID</th>
                <th className="text-left p-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {skippedRows.slice(0, 20).map((row, index) => (
                <tr key={index} className="border-b border-destructive/20">
                  <td className="p-2">{row.row}</td>
                  <td className="p-2">{row.driver_id || '-'}</td>
                  <td className="p-2 text-destructive">{row.reason}</td>
                </tr>
              ))}
              {skippedRows.length > 20 && (
                <tr>
                  <td colSpan={3} className="p-2 text-muted-foreground italic">
                    ... and {skippedRows.length - 20} more skipped rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview table */}
      {previewData && previewData.length > 0 && (
        <div className="mt-4 bg-muted/50 rounded-lg p-4 overflow-x-auto">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Preview (first 5 rows)
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2">Driver ID</th>
                <th className="text-left p-2">Name</th>
                <th className="text-right p-2">WrkDays</th>
                <th className="text-right p-2">Total Trips</th>
                <th className="text-right p-2">TotalIncome</th>
                <th className="text-left p-2">Shift</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, index) => (
                <tr key={index} className="border-b border-border">
                  <td className="p-2">{row.driver_id}</td>
                  <td className="p-2">{row.driver_name || '-'}</td>
                  <td className="text-right p-2">{row.working_days}</td>
                  <td className="text-right p-2">{row.total_trips ?? '-'}</td>
                  <td className="text-right p-2">{row.total_income.toFixed(2)}</td>
                  <td className="p-2">{row.shift || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};