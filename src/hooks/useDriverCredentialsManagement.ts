import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { uploadDriverCredential } from "@/services/driverUploadService";

export interface DriverCredential {
  id: string;
  driver_id: string;
  user_id: string | null;
  status: string;
  created_at: string | null;
  password_text: string | null;
}

export const useDriverCredentialsManagement = () => {
  const navigate = useNavigate();
  const { isAdmin, canAccessAdminPages, user } = useAuth();
  const [drivers, setDrivers] = useState<DriverCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; currentDriverId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [resetPasswordDriver, setResetPasswordDriver] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDriverId, setNewDriverId] = useState("");
  const [newDriverPassword, setNewDriverPassword] = useState("");
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const isStaff = canAccessAdminPages && !isAdmin;

  const togglePasswordVisibility = useCallback((driverId: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  }, []);

  const generateRandomPassword = useCallback(() => {
    const password = Math.floor(100000 + Math.random() * 900000).toString();
    setNewDriverPassword(password);
  }, []);

  useEffect(() => {
    if (!canAccessAdminPages) { navigate("/home"); return; }
    fetchDrivers();
  }, [canAccessAdminPages, navigate]);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const PAGE = 1000;
      let allDrivers: DriverCredential[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('driver_credentials').select('*')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allDrivers = [...allDrivers, ...data];
          from += PAGE;
          hasMore = data.length === PAGE;
        } else hasMore = false;
      }
      setDrivers(allDrivers);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddDriver = useCallback(async () => {
    const trimmedId = newDriverId.trim();
    const trimmedPw = newDriverPassword.trim();
    if (!trimmedId) { toast.error("Please enter a Driver ID"); return; }
    if (!trimmedPw || trimmedPw.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (drivers.some(d => d.driver_id === trimmedId)) { toast.error(`Driver ${trimmedId} already exists`); return; }

    setIsAddingDriver(true);
    try {
      const { data, error } = await supabase.functions.invoke("driver-credentials-bulk", {
        body: { drivers: [{ driverId: trimmedId, password: trimmedPw, status: "enabled" }], replaceExisting: false },
      });
      if (error) throw error;
      const result = data as any;
      if (result?.errors?.length > 0) {
        toast.error(result.errors[0]?.error || "Failed to add driver");
      } else {
        toast.success(`Driver ${trimmedId} added successfully`);
        setNewDriverId(""); setNewDriverPassword(""); setShowAddForm(false);
        await fetchDrivers();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add driver");
    } finally {
      setIsAddingDriver(false);
    }
  }, [newDriverId, newDriverPassword, drivers, fetchDrivers]);

  const toggleDriverStatus = useCallback(async (driver: DriverCredential) => {
    setUpdatingId(driver.id);
    const newStatus = driver.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      const { error } = await supabase.from('driver_credentials').update({ status: newStatus }).eq('id', driver.id);
      if (error) throw error;
      setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, status: newStatus } : d));
      toast.success(`Driver ${driver.driver_id} ${newStatus}`);
    } catch {
      toast.error("Failed to update driver status");
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const bulkUpdateStatus = useCallback(async (newStatus: 'enabled' | 'disabled') => {
    if (drivers.length === 0) return;
    setBulkUpdating(true);
    try {
      const { error } = await supabase.from('driver_credentials').update({ status: newStatus }).neq('status', newStatus);
      if (error) throw error;
      setDrivers(prev => prev.map(d => ({ ...d, status: newStatus })));
      const count = drivers.filter(d => d.status !== newStatus).length;
      toast.success(`${count} driver(s) ${newStatus}`);
    } catch {
      toast.error("Failed to update drivers");
    } finally {
      setBulkUpdating(false);
    }
  }, [drivers]);

  const clearAllDriverCredentials = useCallback(async () => {
    if (drivers.length === 0) return;
    setIsClearing(true);
    try {
      const { error } = await supabase.from('driver_credentials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      setDrivers([]);
      toast.success("All driver credentials cleared successfully");
    } catch (error: any) {
      toast.error("Failed to clear driver credentials: " + error.message);
    } finally {
      setIsClearing(false);
    }
  }, [drivers.length]);

  const downloadTemplate = useCallback(() => {
    const csvContent = "driverId,password,status\nDRV001,password123,enabled\nDRV002,password456,disabled";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url); link.setAttribute("download", "driver_credentials_template.csv");
    link.style.visibility = "hidden"; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success("Template downloaded");
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true); setUploadProgress(null);
    try {
      const result = await uploadDriverCredential(file, (progress) => setUploadProgress(progress));
      if (result.success.length > 0) toast.success(`Successfully uploaded ${result.success.length} driver(s)`);
      if (result.errors.length > 0) toast.error(`Failed to upload ${result.errors.length} driver(s)`);
      await fetchDrivers();
    } catch (error: any) {
      toast.error("Failed to upload file: " + error.message);
    } finally {
      setIsUploading(false); setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [fetchDrivers]);

  const filteredDrivers = useMemo(() =>
    drivers.filter(driver => driver.driver_id.toLowerCase().includes(searchTerm.toLowerCase())),
    [drivers, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / PAGE_SIZE));
  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDrivers.slice(start, start + PAGE_SIZE);
  }, [filteredDrivers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const { enabledCount, disabledCount } = useMemo(() => ({
    enabledCount: drivers.filter(d => d.status === 'enabled').length,
    disabledCount: drivers.filter(d => d.status === 'disabled').length,
  }), [drivers]);

  return {
    drivers, loading, searchTerm, setSearchTerm, updatingId, isUploading, uploadProgress,
    fileInputRef, bulkUpdating, isClearing, resetPasswordDriver, setResetPasswordDriver,
    currentPage, setCurrentPage, PAGE_SIZE, showAddForm, setShowAddForm,
    newDriverId, setNewDriverId, newDriverPassword, setNewDriverPassword,
    isAddingDriver, visiblePasswords, isStaff, isAdmin, canAccessAdminPages,
    togglePasswordVisibility, generateRandomPassword, fetchDrivers,
    handleAddDriver, toggleDriverStatus, bulkUpdateStatus, clearAllDriverCredentials,
    downloadTemplate, handleFileUpload, filteredDrivers, totalPages, paginatedDrivers,
    enabledCount, disabledCount,
  };
};
