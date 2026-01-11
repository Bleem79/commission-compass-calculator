import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, Download, Upload, Loader2, Target, FileSpreadsheet, 
  ChevronDown, ChevronUp, Trash2, Search, Users, Hash, Calendar
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TargetTripsRow {
  driver_id: string;
  driver_name: string;
  target_trips: number;
  completed_trips: number;
  month: string;
  year: number;
}

interface TargetTripsRecord {
  id: string;
  driver_id: string;
  driver_name: string | null;
  target_trips: number;
  completed_trips: number;
  month: string;
  year: number;
  created_at: string;
}

interface TargetTripsConfig {
  numberOfDays: number;
  tiers: {
    [key: string]: { "24H": number; "12H": number };
  };
}

const DEFAULT_TIERS = ["Base", "Base+1", "Base+2", "Base+3", "Base+4", "Base+5"];
const CHUNK_SIZE = 250;

const chunkArray = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const TargetTripsUploadPage = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<TargetTripsRow[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; uploaded: number } | null>(null);
  const [reportHeading, setReportHeading] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [targetConfig, setTargetConfig] = useState<TargetTripsConfig>({
    numberOfDays: 31,
    tiers: {
      "Base": { "24H": 250, "12H": 190 },
      "Base+1": { "24H": 350, "12H": 265 },
      "Base+2": { "24H": 450, "12H": 340 },
      "Base+3": { "24H": 550, "12H": 415 },
      "Base+4": { "24H": 650, "12H": 490 },
      "Base+5": { "24H": 850, "12H": 640 },
    },
  });

  // Data display state
  const [records, setRecords] = useState<TargetTripsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [isClearing, setIsClearing] = useState(false);

  const updateTierValue = (tier: string, shift: "24H" | "12H", value: number) => {
    setTargetConfig((prev) => ({
      ...prev,
      tiers: {
        ...prev.tiers,
        [tier]: {
          ...prev.tiers[tier],
          [shift]: value,
        },
      },
    }));
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home");
    }
  }, [isAdmin, navigate]);

  // Fetch records
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("target_trips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      console.error("Error fetching records:", error);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchRecords();
    }
  }, [isAdmin]);

  const downloadTemplate = () => {
    const csvContent = `Driver ID,Shift,Final Target
100525,1,24
100955,1,28
101680,1,25
101692,1,23
101709,1,22
102141,1,23
102456,1,20`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "target_trips_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template downloaded");
  };

  const parseCSV = (text: string): TargetTripsRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error("File must have at least a header row and one data row");
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const driverIdIdx = headers.findIndex(h => h.includes('driver') && h.includes('id'));
    const shiftIdx = headers.findIndex(h => h.includes('shift'));
    const finalTargetIdx = headers.findIndex(h => h.includes('final') && h.includes('target'));
    const targetTripsIdx = finalTargetIdx !== -1 ? finalTargetIdx : headers.findIndex(h => h.includes('target'));
    const driverNameIdx = headers.findIndex(h => h.includes('driver') && h.includes('name'));
    const completedTripsIdx = headers.findIndex(h => h.includes('completed'));
    const monthIdx = headers.findIndex(h => h.includes('month'));
    const yearIdx = headers.findIndex(h => h.includes('year'));

    if (driverIdIdx === -1 || targetTripsIdx === -1) {
      throw new Error("CSV must contain 'Driver ID' and 'Final Target' (or 'Target Trips') columns");
    }

    const data: TargetTripsRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2 || !values[driverIdIdx]) continue;
      
      data.push({
        driver_id: values[driverIdIdx],
        driver_name: driverNameIdx !== -1 ? values[driverNameIdx] : '',
        target_trips: parseInt(values[targetTripsIdx]) || 0,
        completed_trips: completedTripsIdx !== -1 ? parseInt(values[completedTripsIdx]) || 0 : 0,
        month: monthIdx !== -1 ? values[monthIdx] : new Date().toLocaleString('default', { month: 'long' }),
        year: yearIdx !== -1 ? parseInt(values[yearIdx]) || new Date().getFullYear() : new Date().getFullYear(),
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
      toast.success(`File loaded: ${data.length} row(s). Click "Upload CSV" to save.`);
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
        driver_name: row.driver_name,
        target_trips: row.target_trips,
        completed_trips: row.completed_trips,
        month: row.month,
        year: row.year,
        uploaded_by: user.id,
      }));

      setUploadProgress({ total: insertData.length, uploaded: 0 });

      const chunks = chunkArray(insertData, CHUNK_SIZE);
      for (const chunk of chunks) {
        const { error } = await supabase.from("target_trips").insert(chunk as any);
        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }

        setUploadProgress((prev) => {
          if (!prev) return { total: insertData.length, uploaded: chunk.length };
          return { total: prev.total, uploaded: prev.uploaded + chunk.length };
        });
      }

      toast.success(`Successfully imported ${insertData.length} target trips records`);
      setSelectedFile(null);
      setPreviewData(null);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      fetchRecords();
    } catch (error: any) {
      console.error("Error uploading target trips:", error);
      toast.error(error.message || "Failed to upload target trips data");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const { error } = await supabase.from("target_trips").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("All records cleared successfully");
      setRecords([]);
    } catch (error: any) {
      console.error("Error clearing records:", error);
      toast.error("Failed to clear records");
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const { error } = await supabase.from("target_trips").delete().eq("id", id);
      if (error) throw error;
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("Record deleted");
    } catch (error: any) {
      console.error("Error deleting record:", error);
      toast.error("Failed to delete record");
    }
  };

  // Filter records
  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      searchQuery === "" ||
      record.driver_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.driver_name && record.driver_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesMonth = monthFilter === "all" || record.month === monthFilter;
    
    return matchesSearch && matchesMonth;
  });

  // Stats
  const totalRecords = records.length;
  const totalTarget = records.reduce((sum, r) => sum + r.target_trips, 0);
  const uniqueDrivers = new Set(records.map((r) => r.driver_id)).size;
  const uniqueMonths = [...new Set(records.map((r) => r.month))];

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Target className="h-8 w-8 text-emerald-400" />
              Target Trips
            </h1>
            <p className="text-slate-400">Manage driver target trips data</p>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Upload Target Trips</h2>
            
            {/* Buttons Row */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="bg-transparent border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Button
                  variant="outline"
                  className="bg-transparent border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV
                </Button>
              </div>

              {selectedFile && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Now"
                  )}
                </Button>
              )}

              <div className="flex-1" />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={records.length === 0 || isClearing}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Records?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {totalRecords} target trips records. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-red-600 hover:bg-red-700">
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <p className="text-sm text-slate-400">
              CSV columns: Driver ID, Shift, Final Target
            </p>

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Uploading records…</span>
                  <span>{uploadProgress.uploaded}/{uploadProgress.total}</span>
                </div>
                <Progress
                  value={uploadProgress.total > 0 ? Math.round((uploadProgress.uploaded / uploadProgress.total) * 100) : 0}
                  className="bg-white/10"
                />
              </div>
            )}

            {/* Configuration Collapsible */}
            <Collapsible open={showConfig} onOpenChange={setShowConfig}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Target Trips Configuration (Optional)
                  </span>
                  {showConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="bg-white/5 rounded-lg p-4 space-y-4">
                  <div className="max-w-xs">
                    <Label htmlFor="numberOfDays" className="text-sm font-medium text-slate-300">
                      No. of Days
                    </Label>
                    <Input
                      id="numberOfDays"
                      type="number"
                      min={1}
                      max={31}
                      value={targetConfig.numberOfDays}
                      onChange={(e) =>
                        setTargetConfig((prev) => ({
                          ...prev,
                          numberOfDays: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="mt-1 bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-300 mb-2 block">
                      Target Trips by Tier
                    </Label>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm rounded-lg overflow-hidden">
                        <thead className="bg-white/10">
                          <tr>
                            <th className="text-left p-2 text-slate-300 font-medium">Tier</th>
                            <th className="text-center p-2 text-slate-300 font-medium">24H</th>
                            <th className="text-center p-2 text-slate-300 font-medium">12H</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DEFAULT_TIERS.map((tier) => (
                            <tr key={tier} className="border-t border-white/10">
                              <td className="p-2 text-slate-300 font-medium">{tier}</td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min={0}
                                  value={targetConfig.tiers[tier]?.["24H"] || 0}
                                  onChange={(e) =>
                                    updateTierValue(tier, "24H", parseInt(e.target.value) || 0)
                                  }
                                  className="h-8 text-center bg-white/10 border-white/20 text-white"
                                />
                              </td>
                              <td className="p-1">
                                <Input
                                  type="number"
                                  min={0}
                                  value={targetConfig.tiers[tier]?.["12H"] || 0}
                                  onChange={(e) =>
                                    updateTierValue(tier, "12H", parseInt(e.target.value) || 0)
                                  }
                                  className="h-8 text-center bg-white/10 border-white/20 text-white"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Hash className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{totalRecords.toLocaleString()}</p>
              <p className="text-sm text-slate-400">Records</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Target className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{totalTarget.toLocaleString()}</p>
              <p className="text-sm text-slate-400">Total Target</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{uniqueDrivers.toLocaleString()}</p>
              <p className="text-sm text-slate-400">Unique Drivers</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Calendar className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-white">{uniqueMonths.length}</p>
              <p className="text-sm text-slate-400">Months</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by Driver ID, Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                />
              </div>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {uniqueMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <span className="ml-3 text-slate-400">Loading records...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No records found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left p-4 text-slate-300 font-medium">Driver ID</th>
                    <th className="text-left p-4 text-slate-300 font-medium">Name</th>
                    <th className="text-right p-4 text-slate-300 font-medium">Target</th>
                    <th className="text-right p-4 text-slate-300 font-medium">Completed</th>
                    <th className="text-left p-4 text-slate-300 font-medium">Month</th>
                    <th className="text-right p-4 text-slate-300 font-medium">Year</th>
                    <th className="text-center p-4 text-slate-300 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice(0, 50).map((record) => (
                    <tr key={record.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-medium">{record.driver_id}</td>
                      <td className="p-4 text-slate-300">{record.driver_name || "-"}</td>
                      <td className="p-4 text-right text-white font-semibold">{record.target_trips}</td>
                      <td className="p-4 text-right text-slate-300">{record.completed_trips}</td>
                      <td className="p-4 text-slate-300">{record.month}</td>
                      <td className="p-4 text-right text-slate-300">{record.year}</td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {filteredRecords.length > 50 && (
            <div className="p-4 text-center text-slate-400 border-t border-white/10">
              Showing 50 of {filteredRecords.length} records
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TargetTripsUploadPage;
