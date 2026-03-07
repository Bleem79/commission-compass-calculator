import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Upload, Loader2, FileWarning, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface BookingRejectionRow {
  month: string;
  driver_id: string;
  driver_name: string;
  offer: string;
  accept: string;
  reject: string;
}

const CHUNK_SIZE = 250;

const chunkArray = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const WarningLettersUploadPage = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BookingRejectionRow[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; uploaded: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home");
    }
  }, [isAdmin, navigate]);

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

    if (driverIdIdx === -1) {
      throw new Error("CSV must contain 'driverId' column");
    }

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

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

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
        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }

        setUploadProgress((prev) => {
          if (!prev) return { total: insertData.length, uploaded: chunk.length };
          return { total: prev.total, uploaded: prev.uploaded + chunk.length };
        });
      }

      toast.success(`Successfully imported ${insertData.length} booking rejection records`);
      setSelectedFile(null);
      setPreviewData(null);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Error uploading booking rejection:", error);
      toast.error(error.message || "Failed to upload booking rejection data");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-amber-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
            className="hover:bg-orange-100"
          >
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
            <CardTitle className="text-lg font-semibold text-slate-800">
              Upload Booking Rejection Data
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
                  Required: driverId | Optional: Month, driverName, offer, accept, reject
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="shrink-0 bg-orange-600 hover:bg-orange-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Booking Rejection
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
      </div>
    </div>
  );
};

export default WarningLettersUploadPage;
