import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Upload, Loader2, Ban, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface AbsentFineRow {
  driver_id: string;
  vehicle_number: string;
  fine_no: string;
  fine_type: string;
  start_date: string;
  end_date: string;
  days: number;
  total_amount: number;
  entered_by: string;
}

const CHUNK_SIZE = 250;

const chunkArray = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const AbsentFineUploadPage = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<AbsentFineRow[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; uploaded: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home");
    }
  }, [isAdmin, navigate]);

  const downloadTemplate = () => {
    const csvContent = `Driver ID,Vehicle Number,Fine No,Fine Type,Start Date,End Date,Days,Total Amount,Entered By
100525,SHJ-12345,AF-001,Unauthorized Leave,2026-01-01,2026-01-03,3,450,Admin
100955,SHJ-67890,AF-002,No Show,2026-01-05,2026-01-05,1,150,Admin
101692,SHJ-11111,AF-003,Late Arrival,2026-01-10,2026-01-10,1,100,Admin`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "absent_fine_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template downloaded");
  };

  const parseCSV = (text: string): AbsentFineRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error("File must have at least a header row and one data row");
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const driverIdIdx = headers.findIndex(h => h.includes('driver') && h.includes('id'));
    const vehicleNumberIdx = headers.findIndex(h => h.includes('vehicle'));
    const fineNoIdx = headers.findIndex(h => h.includes('fine') && h.includes('no'));
    const fineTypeIdx = headers.findIndex(h => h.includes('fine') && h.includes('type'));
    const startDateIdx = headers.findIndex(h => h.includes('start'));
    const endDateIdx = headers.findIndex(h => h.includes('end'));
    const daysIdx = headers.findIndex(h => h.includes('days'));
    const amountIdx = headers.findIndex(h => h.includes('amount'));
    const enteredByIdx = headers.findIndex(h => h.includes('entered'));

    if (driverIdIdx === -1 || fineTypeIdx === -1) {
      throw new Error("CSV must contain 'Driver ID' and 'Fine Type' columns");
    }

    const data: AbsentFineRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2 || !values[driverIdIdx]) continue;
      
      data.push({
        driver_id: values[driverIdIdx],
        vehicle_number: vehicleNumberIdx !== -1 ? values[vehicleNumberIdx] : '',
        fine_no: fineNoIdx !== -1 ? values[fineNoIdx] : `AF-${Date.now()}-${i}`,
        fine_type: values[fineTypeIdx] || 'Other',
        start_date: startDateIdx !== -1 ? values[startDateIdx] : new Date().toISOString().split('T')[0],
        end_date: endDateIdx !== -1 ? values[endDateIdx] : new Date().toISOString().split('T')[0],
        days: daysIdx !== -1 ? parseInt(values[daysIdx]) || 1 : 1,
        total_amount: amountIdx !== -1 ? parseFloat(values[amountIdx]) || 0 : 0,
        entered_by: enteredByIdx !== -1 ? values[enteredByIdx] : 'Admin',
      });
    }
    
    return data;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setSelectedFile(file);

    try {
      const text = await file.text();
      const data = parseCSV(text);
      setPreviewData(data.slice(0, 5));
      toast.success(`File loaded: ${data.length} row(s). Click "Import Absent Fines" to save.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to parse file");
      setSelectedFile(null);
      setPreviewData(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(null);

    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);

      const insertData = data.map((row) => ({
        driver_id: row.driver_id,
        vehicle_number: row.vehicle_number,
        fine_no: row.fine_no,
        fine_type: row.fine_type,
        start_date: row.start_date,
        end_date: row.end_date,
        days: row.days,
        total_amount: row.total_amount,
        entered_by: row.entered_by,
        uploaded_by: user.id,
      }));

      setUploadProgress({ total: insertData.length, uploaded: 0 });

      const chunks = chunkArray(insertData, CHUNK_SIZE);
      for (const chunk of chunks) {
        const { error } = await supabase.from("driver_absent_fines").insert(chunk as any);
        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }

        setUploadProgress((prev) => {
          if (!prev) return { total: insertData.length, uploaded: chunk.length };
          return { total: prev.total, uploaded: prev.uploaded + chunk.length };
        });
      }

      toast.success(`Successfully imported ${insertData.length} absent fine records`);
      setSelectedFile(null);
      setPreviewData(null);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Error uploading absent fines:", error);
      toast.error(error.message || "Failed to upload absent fine data");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-red-50 to-rose-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
            className="hover:bg-red-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-red-800 flex items-center gap-3">
              <Ban className="h-8 w-8" />
              Absent Fine Upload
            </h1>
            <p className="text-slate-600">Upload driver absent fine data</p>
          </div>
        </div>

        {/* Upload Card */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Upload Absent Fine Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Download Template */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* File Input */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="file">CSV File</Label>
                <Input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required: Driver ID, Fine Type | Optional: Vehicle Number, Fine No, Start Date, End Date, Days, Total Amount, Entered By
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="shrink-0 bg-red-600 hover:bg-red-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Absent Fines
                  </>
                )}
              </Button>
            </div>

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Uploading records…</span>
                  <span>{uploadProgress.uploaded}/{uploadProgress.total}</span>
                </div>
                <Progress
                  value={uploadProgress.total > 0 ? Math.round((uploadProgress.uploaded / uploadProgress.total) * 100) : 0}
                />
              </div>
            )}

            {/* Preview Table */}
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
                      <th className="text-left p-2">Vehicle</th>
                      <th className="text-left p-2">Fine Type</th>
                      <th className="text-left p-2">Start Date</th>
                      <th className="text-left p-2">End Date</th>
                      <th className="text-right p-2">Days</th>
                      <th className="text-right p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="p-2">{row.driver_id}</td>
                        <td className="p-2">{row.vehicle_number || '-'}</td>
                        <td className="p-2">{row.fine_type}</td>
                        <td className="p-2">{row.start_date}</td>
                        <td className="p-2">{row.end_date}</td>
                        <td className="text-right p-2">{row.days}</td>
                        <td className="text-right p-2">{row.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AbsentFineUploadPage;
