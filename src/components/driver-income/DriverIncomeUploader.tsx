import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { processDriverIncomeFile, DriverIncomeRow } from "@/utils/excel/processDriverIncomeFile";

interface DriverIncomeUploaderProps {
  userId: string;
  onUploadSuccess: () => void;
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export const DriverIncomeUploader = ({ userId, onUploadSuccess }: DriverIncomeUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [previewData, setPreviewData] = useState<DriverIncomeRow[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; uploaded: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const data = await processDriverIncomeFile(file);
      setPreviewData(data.slice(0, 5)); // Show first 5 rows as preview
      toast.success(`File parsed successfully. ${data.length} records found.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to parse file");
      setSelectedFile(null);
      setPreviewData(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedMonth || !selectedYear) {
      toast.error("Please select a file, month, and year");
      return;
    }

    setIsUploading(true);
    setUploadProgress(null);

    try {
      const data = await processDriverIncomeFile(selectedFile);

      // Insert data into database
      const insertData = data.map((row) => ({
        driver_id: row.driver_id,
        driver_name: row.driver_name,
        working_days: row.working_days,
        total_income: row.total_income,
        average_daily_income: row.average_daily_income,
        month: selectedMonth,
        year: parseInt(selectedYear, 10),
        uploaded_by: userId,
      }));

      setUploadProgress({ total: insertData.length, uploaded: 0 });

      const chunks = chunkArray(insertData, CHUNK_SIZE);
      for (const chunk of chunks) {
        const { error } = await supabase.from("driver_income").insert(chunk);
        if (error) throw error;

        setUploadProgress((prev) => {
          if (!prev) return { total: insertData.length, uploaded: chunk.length };
          return { total: prev.total, uploaded: prev.uploaded + chunk.length };
        });
      }

      toast.success(`Successfully imported ${insertData.length} driver income records`);
      setSelectedFile(null);
      setPreviewData(null);
      setSelectedMonth("");
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onUploadSuccess();
    } catch (error: any) {
      console.error("Error uploading driver income:", error);
      toast.error(formatSupabaseError(error));
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Driver ID,Date,Driver Name,Total Trips,WrkDays,TotalIncome,DrvrIncome,Shift
100525,26-04-25,MUHAMMAD SIDDIQUE AMIR AHMED,10,1,184.75,119.32,1- W/O Basic
100955,26-04-25,ABDUL ROUF POOMANGAL,15,1,592.50,413.18,1- W/O Basic
101680,26-04-25,KHAIR MUHAMMAD SHAJI MUHAMMAD,18,1,324.75,201.94,1- W/O Basic`;
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
      {/* Download Template Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={downloadTemplate}
          className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="month">Month</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="year">Year</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="file">Excel/CSV File</Label>
        <div className="flex gap-2 mt-1">
          <Input
            ref={fileInputRef}
            id="file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="flex-1"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Required columns: Driver ID, WrkDays, TotalIncome. Optional: Driver Name, DrvrIncome, Date, Total Trips, Shift
        </p>
      </div>

      {previewData && previewData.length > 0 && (
        <div className="mt-4 bg-gray-50 rounded-lg p-4 overflow-x-auto">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Preview (first 5 rows)
          </h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Driver ID</th>
                <th className="text-left p-2">Name</th>
                <th className="text-right p-2">Days</th>
                <th className="text-right p-2">Total Income</th>
                <th className="text-right p-2">Avg Daily</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{row.driver_id}</td>
                  <td className="p-2">{row.driver_name || '-'}</td>
                  <td className="text-right p-2">{row.working_days}</td>
                  <td className="text-right p-2">{row.total_income.toFixed(2)}</td>
                  <td className="text-right p-2">{row.average_daily_income?.toFixed(2) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || !selectedMonth || !selectedYear || isUploading}
        className="w-full"
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
  );
};
