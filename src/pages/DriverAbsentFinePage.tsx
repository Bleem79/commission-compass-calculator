import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FineUploadSection } from "@/components/absent-fine/FineUploadSection";
import { FineTable } from "@/components/absent-fine/FineTable";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [fineTypeFilter, setFineTypeFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fineTypes = useMemo(() => {
    return [...new Set(fines.map(f => f.fine_type))].sort();
  }, [fines]);

  const filteredFines = useMemo(() => {
    return fines.filter(fine => {
      const matchesSearch = searchQuery === "" || 
        fine.fine_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fine.driver_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fine.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fine.entered_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fine.driver_reason?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFineType = fineTypeFilter === "all" || fine.fine_type === fineTypeFilter;
      return matchesSearch && matchesFineType;
    });
  }, [fines, searchQuery, fineTypeFilter]);

  useEffect(() => {
    if (!isAdmin) { navigate("/home"); return; }
    fetchFines();
  }, [isAdmin, navigate]);

  const fetchFines = useCallback(async () => {
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
  }, []);

  const downloadTemplate = useCallback(() => {
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
  }, []);

  const parseDate = (dateStr: string): string => {
    const parts = dateStr.trim().split("-");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      let year = parts[2];
      if (year.length === 2) year = "20" + year;
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  const parseTimestamp = (timestampStr: string): string => {
    const parts = timestampStr.trim().split(" ");
    if (parts.length >= 1) {
      const datePart = parseDate(parts[0]);
      if (parts.length >= 2) {
        const [hours, minutes] = parts[1].split(":");
        return `${datePart}T${hours.padStart(2, "0")}:${(minutes || "00").padStart(2, "0")}:00`;
      }
      return `${datePart}T00:00:00`;
    }
    return new Date().toISOString();
  };

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      if (lines.length < 2) throw new Error("CSV file must have a header row and at least one data row");

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const headerMap: Record<string, number> = {};
      headers.forEach((h, i) => { headerMap[h] = i; });

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

        if (record.driver_id && record.fine_type) records.push(record);
        setUploadProgress(Math.round(((i + 1) / dataLines.length) * 50));
      }

      if (records.length === 0) throw new Error("No valid records found in the CSV file");

      const chunkSize = 100;
      for (let i = 0; i < records.length; i += chunkSize) {
        const { error } = await supabase.from("driver_absent_fines").insert(records.slice(i, i + chunkSize));
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
  }, [user, fetchFines]);

  const clearAllFines = useCallback(async () => {
    try {
      const { error } = await supabase.from("driver_absent_fines").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("All fine records cleared");
      setFines([]);
    } catch (error: any) {
      toast.error("Failed to clear fines", { description: error.message });
    }
  }, []);

  const deleteFine = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("driver_absent_fines").delete().eq("id", id);
      if (error) throw error;
      setFines(prev => prev.filter(f => f.id !== id));
      toast.success("Fine record deleted");
    } catch (error: any) {
      toast.error("Failed to delete fine", { description: error.message });
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Memoized stats
  const stats = useMemo(() => ({
    records: filteredFines.length,
    totalAmount: filteredFines.reduce((sum, f) => sum + f.total_amount, 0),
    uniqueDrivers: new Set(filteredFines.map(f => f.driver_id)).size,
    totalDays: filteredFines.reduce((sum, f) => sum + f.days, 0),
  }), [filteredFines]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Drivers Absent Fine</h1>
              <p className="text-sm text-white/60">Manage driver absence fines</p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <FineUploadSection
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          totalFines={fines.length}
          onDownloadTemplate={downloadTemplate}
          onFileUpload={handleFileUpload}
          onClearAll={clearAllFines}
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: `Records ${searchQuery || fineTypeFilter !== "all" ? "(filtered)" : ""}`, value: stats.records },
            { label: "Total Amount", value: stats.totalAmount.toLocaleString() },
            { label: "Unique Drivers", value: stats.uniqueDrivers },
            { label: "Total Days", value: stats.totalDays },
          ].map(({ label, value }) => (
            <Card key={label} className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-white/60">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Fine No, Driver ID, Vehicle, Reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                {searchQuery && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-white/60 hover:text-white" onClick={() => setSearchQuery("")}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Select value={fineTypeFilter} onValueChange={setFineTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Filter by Fine Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fine Types</SelectItem>
                  {fineTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(searchQuery || fineTypeFilter !== "all") && (
                <Button
                  variant="outline"
                  onClick={() => { setSearchQuery(""); setFineTypeFilter("all"); }}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <FineTable
          fines={filteredFines}
          totalCount={fines.length}
          isLoading={isLoading}
          deletingId={deletingId}
          onDelete={deleteFine}
        />

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col items-center gap-3">
            <img src="/lovable-uploads/aman-logo-footer.png" alt="Aman Taxi Sharjah" className="h-8 sm:h-10 object-contain opacity-70" />
            <p className="text-xs text-white/40">© {new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DriverAbsentFinePage;
