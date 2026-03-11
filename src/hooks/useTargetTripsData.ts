import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export interface TargetTripsRow {
  driver_id: string;
  driver_name: string;
  target_trips: number;
  completed_trips: number;
  month: string;
  year: number;
  shift: string;
}

export interface TargetTripsRecord {
  id: string;
  driver_id: string;
  driver_name: string | null;
  target_trips: number;
  completed_trips: number;
  month: string;
  year: number;
  shift: string | null;
  created_at: string;
}

export interface TargetTripsConfig {
  numberOfDays: number;
  tiers: { [key: string]: { "24H": number; "12H": number } };
}

export const DEFAULT_TIERS = ["Base", "Base+1", "Base+2", "Base+3", "Base+4", "Base+5"];
const CHUNK_SIZE = 250;

const DEFAULT_CONFIG: TargetTripsConfig = {
  numberOfDays: 31,
  tiers: {
    "Base": { "24H": 250, "12H": 190 },
    "Base+1": { "24H": 350, "12H": 265 },
    "Base+2": { "24H": 450, "12H": 340 },
    "Base+3": { "24H": 550, "12H": 415 },
    "Base+4": { "24H": 650, "12H": 490 },
    "Base+5": { "24H": 850, "12H": 640 },
  },
};

const chunkArray = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const useTargetTripsData = () => {
  const navigate = useNavigate();
  const { isAdmin, canAccessAdminPages, user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<TargetTripsRow[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; uploaded: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [targetConfig, setTargetConfig] = useState<TargetTripsConfig>({ ...DEFAULT_CONFIG });
  const [records, setRecords] = useState<TargetTripsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [isClearing, setIsClearing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [initialConfig, setInitialConfig] = useState<TargetTripsConfig>({ ...DEFAULT_CONFIG });

  const hasConfigChanges = useMemo(() => {
    if (targetConfig.numberOfDays !== initialConfig.numberOfDays) return true;
    for (const tier of DEFAULT_TIERS) {
      if (targetConfig.tiers[tier]?.["24H"] !== initialConfig.tiers[tier]?.["24H"]) return true;
      if (targetConfig.tiers[tier]?.["12H"] !== initialConfig.tiers[tier]?.["12H"]) return true;
    }
    return false;
  }, [targetConfig, initialConfig]);

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      localStorage.setItem('targetTripsConfig', JSON.stringify(targetConfig));
      setInitialConfig(JSON.parse(JSON.stringify(targetConfig)));
      toast.success("Configuration saved successfully");
    } catch {
      toast.error("Failed to save configuration");
    } finally { setIsSavingConfig(false); }
  };

  useEffect(() => {
    const savedConfig = localStorage.getItem('targetTripsConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setTargetConfig(parsed); setInitialConfig(parsed);
      } catch (e) { console.error("Failed to parse saved config:", e); }
    }
  }, []);

  const updateTierValue = (tier: string, shift: "24H" | "12H", value: number) => {
    setTargetConfig((prev) => ({
      ...prev,
      tiers: { ...prev.tiers, [tier]: { ...prev.tiers[tier], [shift]: value } },
    }));
  };

  useEffect(() => {
    if (!canAccessAdminPages) navigate("/home");
  }, [canAccessAdminPages, navigate]);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      let allRecords: TargetTripsRecord[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase.from("target_trips").select("*").order("created_at", { ascending: false }).range(from, from + pageSize - 1);
        if (error) throw error;
        if (data && data.length > 0) { allRecords = [...allRecords, ...data]; from += pageSize; hasMore = data.length === pageSize; }
        else hasMore = false;
      }
      const driverIds = [...new Set(allRecords.map(r => r.driver_id))];
      const driverNameMap: Record<string, string> = {};
      for (let i = 0; i < driverIds.length; i += 100) {
        const batch = driverIds.slice(i, i + 100);
        const { data: incomeData } = await supabase.from("driver_income").select("driver_id, driver_name").in("driver_id", batch);
        if (incomeData) incomeData.forEach(item => { if (item.driver_name && !driverNameMap[item.driver_id]) driverNameMap[item.driver_id] = item.driver_name; });
      }
      setRecords(allRecords.map(record => ({ ...record, driver_name: record.driver_name || driverNameMap[record.driver_id] || null })));
    } catch {
      toast.error("Failed to load records");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (canAccessAdminPages) fetchRecords();
  }, [canAccessAdminPages, fetchRecords]);

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
    if (driverIdIdx === -1 || targetTripsIdx === -1) throw new Error("CSV must contain 'Driver ID' and 'Final Target' columns");

    const data: TargetTripsRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 2 || !values[driverIdIdx]) continue;
      let shiftValue = shiftIdx !== -1 ? values[shiftIdx] : '';
      if (shiftValue === '1' || shiftValue.startsWith('1')) shiftValue = '24H';
      else if (shiftValue === '2' || shiftValue.startsWith('2')) shiftValue = '12H';
      data.push({
        driver_id: values[driverIdIdx],
        driver_name: driverNameIdx !== -1 ? values[driverNameIdx] : '',
        target_trips: parseFloat(values[targetTripsIdx]) || 0,
        completed_trips: completedTripsIdx !== -1 ? parseInt(values[completedTripsIdx]) || 0 : 0,
        month: monthIdx !== -1 ? values[monthIdx] : new Date().toLocaleString('default', { month: 'long' }),
        year: yearIdx !== -1 ? parseInt(values[yearIdx]) || new Date().getFullYear() : new Date().getFullYear(),
        shift: shiftValue,
      });
    }
    return data;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error("Please upload a CSV file"); return; }
    setSelectedFile(file);
    try {
      const text = await file.text();
      const data = parseCSV(text);
      setPreviewData(data.slice(0, 5));
      toast.success(`File loaded: ${data.length} row(s). Click "Upload CSV" to save.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to parse file");
      setSelectedFile(null); setPreviewData(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) { toast.error("Please select a file"); return; }
    setIsUploading(true); setUploadProgress(null);
    try {
      const text = await selectedFile.text();
      const data = parseCSV(text);
      const insertData = data.map((row) => ({
        driver_id: row.driver_id, driver_name: row.driver_name, target_trips: row.target_trips,
        completed_trips: row.completed_trips, month: row.month, year: row.year,
        shift: row.shift || null, uploaded_by: user.id,
      }));
      setUploadProgress({ total: insertData.length, uploaded: 0 });
      const chunks = chunkArray(insertData, CHUNK_SIZE);
      for (const chunk of chunks) {
        const { error } = await supabase.from("target_trips").insert(chunk as any);
        if (error) throw error;
        setUploadProgress((prev) => prev ? { total: prev.total, uploaded: prev.uploaded + chunk.length } : { total: insertData.length, uploaded: chunk.length });
      }
      toast.success(`Successfully imported ${insertData.length} target trips records`);
      setSelectedFile(null); setPreviewData(null); setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchRecords();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload target trips data");
    } finally { setIsUploading(false); }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm("Are you sure you want to delete ALL target trips records? This action cannot be undone.");
    if (!confirmed) return;
    setIsClearing(true);
    try {
      const { error } = await supabase.from("target_trips").delete().gte("created_at", "1900-01-01");
      if (error) throw error;
      toast.success("All target trips records cleared successfully");
      setRecords([]); setPreviewData(null); setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast.error(error.message || "Failed to clear records");
    } finally { setIsClearing(false); }
  };

  const handleExportToExcel = () => {
    if (records.length === 0) { toast.error("No records to export"); return; }
    try {
      const exportData = records.map((record) => ({
        "Driver ID": record.driver_id, "Driver Name": record.driver_name || "", "Shift": record.shift || "",
        "Target Trips": record.target_trips, "Completed Trips": record.completed_trips,
        "Month": record.month, "Year": record.year, "Created At": new Date(record.created_at).toLocaleString(),
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, "Target Trips");
      const date = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `target_trips_${date}.xlsx`);
      toast.success(`Exported ${records.length} records`);
    } catch {
      toast.error("Failed to export data");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      const { error } = await supabase.from("target_trips").delete().eq("id", id);
      if (error) throw error;
      setRecords((prev) => prev.filter((r) => r.id !== id));
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const filteredRecords = useMemo(() => records.filter((record) => {
    const matchesSearch = searchQuery === "" || record.driver_id.toLowerCase().includes(searchQuery.toLowerCase()) || (record.driver_name && record.driver_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesMonth = monthFilter === "all" || record.month === monthFilter;
    return matchesSearch && matchesMonth;
  }), [records, searchQuery, monthFilter]);

  const totalRecords = records.length;
  const totalTarget = useMemo(() => records.reduce((sum, r) => sum + r.target_trips, 0), [records]);
  const uniqueDrivers = useMemo(() => new Set(records.map((r) => r.driver_id)).size, [records]);
  const uniqueMonths = useMemo(() => [...new Set(records.map((r) => r.month))], [records]);

  return {
    isAdmin, canAccessAdminPages, isUploading, selectedFile, previewData, uploadProgress,
    fileInputRef, showConfig, setShowConfig, targetConfig, setTargetConfig, records, loading,
    searchQuery, setSearchQuery, monthFilter, setMonthFilter, isClearing, isSavingConfig,
    selectedDriverId, setSelectedDriverId, hasConfigChanges, handleSaveConfig, updateTierValue,
    fetchRecords, downloadTemplate: () => {
      const csvContent = `Driver ID,Shift,Final Target\n100525,1,24\n100955,1,28\n101680,1,25\n101692,1,23\n101709,1,22\n102141,1,23\n102456,1,20`;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.setAttribute("href", URL.createObjectURL(blob));
      link.setAttribute("download", "target_trips_template.csv");
      link.style.visibility = "hidden"; document.body.appendChild(link); link.click(); document.body.removeChild(link);
      toast.success("Template downloaded");
    },
    handleFileChange, handleUpload, handleClearAll, handleExportToExcel, handleDeleteRecord,
    filteredRecords, totalRecords, totalTarget, uniqueDrivers, uniqueMonths,
  };
};
