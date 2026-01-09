import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface FineRecord {
  id: string;
  fine_no: string;
  driver_id: string;
  vehicle_number: string;
  fine_type: string;
  driver_reason: string | null;
  start_date: string;
  end_date: string;
  days: number;
  total_amount: number;
  timestamp: string;
  entered_by: string;
}

const DriverAbsentFinePage = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home");
      return;
    }
    fetchFines();
  }, [isAdmin, navigate]);

  const fetchFines = async () => {
    try {
      const { data, error } = await supabase
        .from("driver_absent_fines")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) throw error;
      setFines(data || []);
    } catch (error: any) {
      toast.error("Failed to load fines", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = "Fine No.,Driver ID,Vehicle Number,Fine Type,Driver Reason,Start Date,End Date,Days,Total Amount,Timestamp,Entered By";
    const sampleRows = [
      "VA2411,113944,A675,Not Reporting For Daily Payment,Late Payment,08-01-26,08-01-26,1,50,09-01-26 8:34,vajid@amantaxi.com",
      "VA2410,115154,A818,Not Reporting For Daily Payment,Dubai-Trip,08-01-26,08-01-26,1,50,09-01-26 8:31,vajid@amantaxi.com"
    ];
    
    const csvContent = [headers, ...sampleRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "driver_absent_fine_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded successfully");
  };

  const parseDate = (dateStr: string): string => {
    // Handle format DD-MM-YY
    const parts = dateStr.trim().split("-");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      let year = parts[2];
      if (year.length === 2) {
        year = "20" + year;
      }
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  const parseTimestamp = (timestampStr: string): string => {
    // Handle format DD-MM-YY H:MM
    const parts = timestampStr.trim().split(" ");
    if (parts.length >= 1) {
      const datePart = parseDate(parts[0]);
      if (parts.length >= 2) {
        const timePart = parts[1];
        const [hours, minutes] = timePart.split(":");
        const paddedHours = hours.padStart(2, "0");
        const paddedMinutes = (minutes || "00").padStart(2, "0");
        return `${datePart}T${paddedHours}:${paddedMinutes}:00`;
      }
      return `${datePart}T00:00:00`;
    }
    return new Date().toISOString();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Invalid file type", { description: "Please upload a CSV file" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV file must have a header row and at least one data row");
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const requiredHeaders = ["fine no.", "driver id", "vehicle number", "fine type"];
      
      const headerMap: Record<string, number> = {};
      headers.forEach((h, i) => {
        headerMap[h] = i;
      });

      const missingHeaders = requiredHeaders.filter(rh => 
        !headers.some(h => h.includes(rh.replace(".", "").toLowerCase()) || h === rh)
      );

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
      }

      const records: any[] = [];
      const dataLines = lines.slice(1);
      
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        if (!line.trim()) continue;

        const values = line.split(",").map(v => v.trim());
        
        const record = {
          fine_no: values[headerMap["fine no."] ?? 0] || `FINE-${Date.now()}-${i}`,
          driver_id: values[headerMap["driver id"] ?? 1] || "",
          vehicle_number: values[headerMap["vehicle number"] ?? 2] || "",
          fine_type: values[headerMap["fine type"] ?? 3] || "",
          driver_reason: values[headerMap["driver reason"] ?? 4] || null,
          start_date: parseDate(values[headerMap["start date"] ?? 5] || new Date().toISOString().split("T")[0]),
          end_date: parseDate(values[headerMap["end date"] ?? 6] || new Date().toISOString().split("T")[0]),
          days: parseInt(values[headerMap["days"] ?? 7]) || 1,
          total_amount: parseFloat(values[headerMap["total amount"] ?? 8]) || 0,
          timestamp: parseTimestamp(values[headerMap["timestamp"] ?? 9] || new Date().toISOString()),
          entered_by: values[headerMap["entered by"] ?? 10] || user?.email || "unknown",
          uploaded_by: user?.id || ""
        };

        if (record.driver_id && record.fine_type) {
          records.push(record);
        }

        setUploadProgress(Math.round(((i + 1) / dataLines.length) * 50));
      }

      if (records.length === 0) {
        throw new Error("No valid records found in the CSV file");
      }

      // Insert in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const { error } = await supabase.from("driver_absent_fines").insert(chunk);
        
        if (error) throw error;
        
        setUploadProgress(50 + Math.round(((i + chunkSize) / records.length) * 50));
      }

      toast.success(`Successfully uploaded ${records.length} fine records`);
      fetchFines();
    } catch (error: any) {
      toast.error("Upload failed", { description: error.message });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = "";
    }
  };

  const clearAllFines = async () => {
    try {
      const { error } = await supabase.from("driver_absent_fines").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("All fine records cleared");
      setFines([]);
    } catch (error: any) {
      toast.error("Failed to clear fines", { description: error.message });
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Drivers Absent Fine</h1>
              <p className="text-sm text-white/60">Manage driver absence fines</p>
            </div>
          </div>
        </div>

        {/* Actions Card */}
        <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Upload Fine Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="bg-white hover:bg-gray-50 border-green-200 text-green-700 hover:text-green-800"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="fine-csv-upload"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                disabled={isUploading}
                onClick={() => document.getElementById("fine-csv-upload")?.click()}
                className="bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-800"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </>
                )}
              </Button>

              {fines.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="ml-auto">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Fine Records?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {fines.length} fine records. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllFines} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-white/60">Processing... {uploadProgress}%</p>
              </div>
            )}

            <p className="text-xs text-white/60">
              CSV columns: <strong>Fine No.</strong>, <strong>Driver ID</strong>, <strong>Vehicle Number</strong>, <strong>Fine Type</strong>, 
              <strong>Driver Reason</strong>, <strong>Start Date</strong>, <strong>End Date</strong>, <strong>Days</strong>, 
              <strong>Total Amount</strong>, <strong>Timestamp</strong>, <strong>Entered By</strong>
            </p>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{fines.length}</p>
              <p className="text-xs text-white/60">Total Records</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">
                {fines.reduce((sum, f) => sum + f.total_amount, 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/60">Total Amount</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">
                {new Set(fines.map(f => f.driver_id)).size}
              </p>
              <p className="text-xs text-white/60">Unique Drivers</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">
                {fines.reduce((sum, f) => sum + f.days, 0)}
              </p>
              <p className="text-xs text-white/60">Total Days</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : fines.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-white/60">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p>No fine records found</p>
                <p className="text-sm">Upload a CSV file to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20 hover:bg-white/5">
                      <TableHead className="text-white/80">Fine No.</TableHead>
                      <TableHead className="text-white/80">Driver ID</TableHead>
                      <TableHead className="text-white/80">Vehicle</TableHead>
                      <TableHead className="text-white/80">Fine Type</TableHead>
                      <TableHead className="text-white/80">Reason</TableHead>
                      <TableHead className="text-white/80">Start</TableHead>
                      <TableHead className="text-white/80">End</TableHead>
                      <TableHead className="text-white/80 text-right">Days</TableHead>
                      <TableHead className="text-white/80 text-right">Amount</TableHead>
                      <TableHead className="text-white/80">Entered By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fines.slice(0, 100).map((fine) => (
                      <TableRow key={fine.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white font-medium">{fine.fine_no}</TableCell>
                        <TableCell className="text-white">{fine.driver_id}</TableCell>
                        <TableCell className="text-white">{fine.vehicle_number}</TableCell>
                        <TableCell className="text-white text-sm">{fine.fine_type}</TableCell>
                        <TableCell className="text-white/80 text-sm">{fine.driver_reason || "-"}</TableCell>
                        <TableCell className="text-white/80 text-sm">{fine.start_date}</TableCell>
                        <TableCell className="text-white/80 text-sm">{fine.end_date}</TableCell>
                        <TableCell className="text-white text-right">{fine.days}</TableCell>
                        <TableCell className="text-white text-right font-medium">{fine.total_amount}</TableCell>
                        <TableCell className="text-white/80 text-sm">{fine.entered_by}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {fines.length > 100 && (
                  <p className="text-center text-white/60 text-sm py-4">
                    Showing 100 of {fines.length} records
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col items-center gap-3">
            <img 
              src="/lovable-uploads/aman-logo-footer.png" 
              alt="Aman Taxi Sharjah" 
              className="h-8 sm:h-10 object-contain opacity-70"
            />
            <p className="text-xs text-white/40">© {new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DriverAbsentFinePage;
