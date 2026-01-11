import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, Upload, Loader2, Target, FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TargetTripsRow {
  driver_id: string;
  driver_name: string;
  target_trips: number;
  completed_trips: number;
  month: string;
  year: number;
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

  const downloadTemplate = () => {
    const csvContent = `Driver ID,Driver Name,Target Trips,Completed Trips,Month,Year
100525,MUHAMMAD SIDDIQUE AMIR AHMED,150,120,January,2026
100955,ABDUL ROUF POOMANGAL,160,145,January,2026
101692,MOHAMMED JAFAR IQBAL ABDUL BASHAR,140,138,January,2026
101709,NOOR MUHAMMAD KHAN,155,150,January,2026
102141,GUL MUHAMMAD KHAN MUNASIB KHAN,145,142,January,2026`;
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
    const driverNameIdx = headers.findIndex(h => h.includes('driver') && h.includes('name'));
    const targetTripsIdx = headers.findIndex(h => h.includes('target'));
    const completedTripsIdx = headers.findIndex(h => h.includes('completed'));
    const monthIdx = headers.findIndex(h => h.includes('month'));
    const yearIdx = headers.findIndex(h => h.includes('year'));

    if (driverIdIdx === -1 || targetTripsIdx === -1) {
      throw new Error("CSV must contain 'Driver ID' and 'Target Trips' columns");
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
      toast.success(`File loaded: ${data.length} row(s). Click "Import Target Trips" to save.`);
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
    } catch (error: any) {
      console.error("Error uploading target trips:", error);
      toast.error(error.message || "Failed to upload target trips data");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-teal-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
            className="hover:bg-emerald-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-emerald-800 flex items-center gap-3">
              <Target className="h-8 w-8" />
              Target Trips Upload
            </h1>
            <p className="text-slate-600">Upload driver target trips data</p>
          </div>
        </div>

        {/* Upload Card */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-800">
              Upload Target Trips Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Report Heading */}
            <div>
              <Label htmlFor="reportHeading" className="text-muted-foreground">
                Report Heading (optional)
              </Label>
              <Input
                id="reportHeading"
                type="text"
                placeholder="e.g., December 26-31, 2025 Target Trips Report"
                value={reportHeading}
                onChange={(e) => setReportHeading(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Target Trips Configuration */}
            <Collapsible open={showConfig} onOpenChange={setShowConfig}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-slate-50 hover:bg-slate-100"
                >
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Target Trips Configuration (Optional)
                  </span>
                  {showConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                  {/* Number of Days */}
                  <div className="max-w-xs">
                    <Label htmlFor="numberOfDays" className="text-sm font-medium">
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
                      className="mt-1 bg-white"
                    />
                  </div>

                  {/* Target Trips Table */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Target Trips by Tier
                    </Label>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                        <thead className="bg-slate-200">
                          <tr>
                            <th className="text-left p-2 border-r border-border font-medium">Tier</th>
                            <th className="text-center p-2 border-r border-border font-medium">24H</th>
                            <th className="text-center p-2 font-medium">12H</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {DEFAULT_TIERS.map((tier) => (
                            <tr key={tier} className="border-t border-border">
                              <td className="p-2 border-r border-border font-medium text-slate-700">
                                {tier}
                              </td>
                              <td className="p-1 border-r border-border">
                                <Input
                                  type="number"
                                  min={0}
                                  value={targetConfig.tiers[tier]?.["24H"] || 0}
                                  onChange={(e) =>
                                    updateTierValue(tier, "24H", parseInt(e.target.value) || 0)
                                  }
                                  className="h-8 text-center"
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
                                  className="h-8 text-center"
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
                  Required: Driver ID, Target Trips | Optional: Driver Name, Completed Trips, Month, Year
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Target Trips
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
                      <th className="text-right p-2">Target</th>
                      <th className="text-right p-2">Completed</th>
                      <th className="text-left p-2">Month</th>
                      <th className="text-right p-2">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="p-2">{row.driver_id}</td>
                        <td className="p-2">{row.driver_name || '-'}</td>
                        <td className="text-right p-2">{row.target_trips}</td>
                        <td className="text-right p-2">{row.completed_trips}</td>
                        <td className="p-2">{row.month}</td>
                        <td className="text-right p-2">{row.year}</td>
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

export default TargetTripsUploadPage;
