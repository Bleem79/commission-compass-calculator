import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Upload, Loader2, Users, FileSpreadsheet, Trash2, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import DriverMasterList from "@/components/driver-master/DriverMasterList";
import * as XLSX from "xlsx";

interface MasterFileRow {
  driver_id: string;
  driver_name: string;
  controller: string;
}

const CHUNK_SIZE = 250;

const chunkArray = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const DriverMasterFilePage = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<MasterFileRow[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; uploaded: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [singleDriverId, setSingleDriverId] = useState("");
  const [singleDriverName, setSingleDriverName] = useState("");
  const [singleController, setSingleController] = useState("");
  const [isAddingSingle, setIsAddingSingle] = useState(false);

  useEffect(() => {
    if (!isAdmin) navigate("/home");
  }, [isAdmin, navigate]);

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Driver ID", "Driver Name", "Controller"],
      ["DRV001", "John Doe", "Controller A"],
      ["DRV002", "Jane Smith", "Controller B"],
    ]);
    ws["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, "Driver Master File");
    XLSX.writeFile(wb, "driver_master_file_template.xlsx");
    toast.success("Template downloaded");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      toast.error("Please upload an Excel or CSV file");
      return;
    }

    setSelectedFile(file);

    try {
      const data = await readFile(file);
      setPreviewData(data.slice(0, 5));
      toast.success(`File loaded: ${data.length} row(s). Click "Import" to save.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to parse file");
      setSelectedFile(null);
      setPreviewData(null);
    }
  };

  const readFile = async (file: File): Promise<MasterFileRow[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

    if (jsonData.length === 0) throw new Error("File is empty");

    return jsonData.map((row) => {
      const keys = Object.keys(row);
      const driverIdKey = keys.find((k) => k.toLowerCase().replace(/\s/g, "").includes("driverid"));
      const nameKey = keys.find((k) => k.toLowerCase().replace(/\s/g, "").includes("drivername") || k.toLowerCase() === "name");
      const controllerKey = keys.find((k) => k.toLowerCase().includes("controller"));

      if (!driverIdKey) throw new Error("Column 'Driver ID' not found");

      return {
        driver_id: String(row[driverIdKey] || "").trim(),
        driver_name: nameKey ? String(row[nameKey] || "").trim() : "",
        controller: controllerKey ? String(row[controllerKey] || "").trim() : "",
      };
    }).filter((r) => r.driver_id);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(null);

    try {
      const data = await readFile(selectedFile);
      const insertData = data.map((row) => ({
        driver_id: row.driver_id,
        driver_name: row.driver_name,
        controller: row.controller,
        uploaded_by: user.id,
      }));

      setUploadProgress({ total: insertData.length, uploaded: 0 });

      const chunks = chunkArray(insertData, CHUNK_SIZE);
      for (const chunk of chunks) {
        const { error } = await supabase.from("driver_master_file").insert(chunk as any);
        if (error) throw error;

        setUploadProgress((prev) => {
          if (!prev) return { total: insertData.length, uploaded: chunk.length };
          return { total: prev.total, uploaded: prev.uploaded + chunk.length };
        });
      }

      toast.success(`Successfully imported ${insertData.length} driver records`);
      setSelectedFile(null);
      setPreviewData(null);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      console.error("Error uploading driver master file:", error);
      toast.error(error.message || "Failed to upload data");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("driver_master_file").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("All driver master file records deleted successfully");
    } catch (error: any) {
      console.error("Error deleting records:", error);
      toast.error(error.message || "Failed to delete records");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddSingleDriver = async () => {
    if (!singleDriverId.trim() || !singleDriverName.trim()) {
      toast.error("Driver ID and Driver Name are required");
      return;
    }
    if (!user) return;

    setIsAddingSingle(true);
    try {
      const { error } = await supabase.from("driver_master_file").insert({
        driver_id: singleDriverId.trim(),
        driver_name: singleDriverName.trim(),
        controller: singleController.trim() || null,
        uploaded_by: user.id,
      } as any);
      if (error) throw error;
      toast.success(`Driver ${singleDriverId.trim()} added successfully`);
      setSingleDriverId("");
      setSingleDriverName("");
      setSingleController("");
    } catch (error: any) {
      toast.error(error.message || "Failed to add driver");
    } finally {
      setIsAddingSingle(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")} className="hover:bg-blue-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-blue-800 flex items-center gap-3">
              <Users className="h-8 w-8" />
              Driver Master File
            </h1>
            <p className="text-slate-600">Upload and manage driver master data</p>
          </div>
        </div>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">Upload Driver Master File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" onClick={downloadTemplate} className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isDeleting} className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? "Deleting..." : "Delete All Records"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Driver Master File Records?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all uploaded driver master file data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700">
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="master-file">Excel / CSV File</Label>
                <Input ref={fileInputRef} id="master-file" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Required: Driver ID, Driver Name | Optional: Controller</p>
              </div>
              <Button onClick={handleUpload} disabled={!selectedFile || isUploading} className="shrink-0 bg-blue-600 hover:bg-blue-700">
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Import Driver Master File</>
                )}
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
                  <FileSpreadsheet className="h-4 w-4" />
                  Preview (first 5 rows)
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Driver ID</th>
                      <th className="text-left p-2">Driver Name</th>
                      <th className="text-left p-2">Controller</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-2">{row.driver_id}</td>
                        <td className="p-2">{row.driver_name || "-"}</td>
                        <td className="p-2">{row.controller || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Single Driver
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="single-driver-id">Driver ID *</Label>
                <Input
                  id="single-driver-id"
                  placeholder="e.g. 100525"
                  value={singleDriverId}
                  onChange={(e) => setSingleDriverId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="single-driver-name">Driver Name *</Label>
                <Input
                  id="single-driver-name"
                  placeholder="e.g. John Doe"
                  value={singleDriverName}
                  onChange={(e) => setSingleDriverName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="single-controller">Controller</Label>
                <Input
                  id="single-controller"
                  placeholder="e.g. Abdul Kadir"
                  value={singleController}
                  onChange={(e) => setSingleController(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <Button
              onClick={handleAddSingleDriver}
              disabled={isAddingSingle || !singleDriverId.trim() || !singleDriverName.trim()}
              className="mt-4 bg-primary hover:bg-primary/90"
            >
              {isAddingSingle ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" />Add Driver</>
              )}
            </Button>
          </CardContent>
        </Card>

        <DriverMasterList />
      </div>
    </div>
  );
};

export default DriverMasterFilePage;
