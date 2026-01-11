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

interface WarningLetterRow {
  driver_id: string;
  driver_name: string;
  warning_type: string;
  warning_date: string;
  description: string;
  issued_by: string;
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
  const [previewData, setPreviewData] = useState<WarningLetterRow[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; uploaded: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home");
    }
  }, [isAdmin, navigate]);

  const downloadTemplate = () => {
    const csvContent = `Driver ID,Driver Name,Warning Type,Warning Date,Description,Issued By
100525,MUHAMMAD SIDDIQUE AMIR AHMED,Verbal Warning,2026-01-01,Late arrival to shift,Admin
100955,ABDUL ROUF POOMANGAL,Written Warning,2026-01-05,Customer complaint,Admin
101692,MOHAMMED JAFAR IQBAL ABDUL BASHAR,Final Warning,2026-01-10,Repeated violations,Admin`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "warning_letters_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template downloaded");
  };

  const parseCSV = (text: string): WarningLetterRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error("File must have at least a header row and one data row");
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const driverIdIdx = headers.findIndex(h => h.includes('driver') && h.includes('id'));
    const driverNameIdx = headers.findIndex(h => h.includes('driver') && h.includes('name'));
    const warningTypeIdx = headers.findIndex(h => h.includes('warning') && h.includes('type'));
    const warningDateIdx = headers.findIndex(h => h.includes('date'));
    const descriptionIdx = headers.findIndex(h => h.includes('description'));
    const issuedByIdx = headers.findIndex(h => h.includes('issued'));

    if (driverIdIdx === -1 || warningTypeIdx === -1) {
      throw new Error("CSV must contain 'Driver ID' and 'Warning Type' columns");
    }

    const data: WarningLetterRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2 || !values[driverIdIdx]) continue;
      
      data.push({
        driver_id: values[driverIdIdx],
        driver_name: driverNameIdx !== -1 ? values[driverNameIdx] : '',
        warning_type: values[warningTypeIdx] || 'Other',
        warning_date: warningDateIdx !== -1 ? values[warningDateIdx] : new Date().toISOString().split('T')[0],
        description: descriptionIdx !== -1 ? values[descriptionIdx] : '',
        issued_by: issuedByIdx !== -1 ? values[issuedByIdx] : 'Admin',
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
      toast.success(`File loaded: ${data.length} row(s). Click "Import Warning Letters" to save.`);
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

      // Upload to storage for reference
      const fileName = `warning-letters-${Date.now()}.csv`;
      await supabase.storage.from('driver-data').upload(fileName, selectedFile);

      setUploadProgress({ total: data.length, uploaded: data.length });

      toast.success(`Successfully processed ${data.length} warning letter records`);
      setSelectedFile(null);
      setPreviewData(null);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Error uploading warning letters:", error);
      toast.error(error.message || "Failed to upload warning letters data");
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
              Warning Letters Upload
            </h1>
            <p className="text-slate-600">Upload driver warning letters data</p>
          </div>
        </div>

        {/* Upload Card */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Upload Warning Letters Data
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
                  Required: Driver ID, Warning Type | Optional: Driver Name, Warning Date, Description, Issued By
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
                    Import Warning Letters
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
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Warning Type</th>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-left p-2">Issued By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="p-2">{row.driver_id}</td>
                        <td className="p-2">{row.driver_name || '-'}</td>
                        <td className="p-2">{row.warning_type}</td>
                        <td className="p-2">{row.warning_date}</td>
                        <td className="p-2">{row.description || '-'}</td>
                        <td className="p-2">{row.issued_by}</td>
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
