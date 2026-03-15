import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ENTRY_REASONS = [
  "Short Collection",
  "ADNOC Fuel Issue",
  "Fuel Chips Issue",
  "CNG Card Lost",
  "CNG Card Damage",
  "Customer Run Away",
  "Fine Removal",
  "Double Shift Partner Complaint",
  "Fuel bill Sign",
  "Customer pay to aman account",
  "Fuel Excess Inquiry",
  "Need to meet operation team",
  "Need to meet operations manager",
];

export interface EntryRecord {
  id: string;
  entry_no: string;
  driver_id: string;
  driver_name: string | null;
  reason: string;
  status: string;
  created_at: string;
  created_by: string | null;
}

const PAGE_SIZE = 15;

export const useEntryPassManagement = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck(false);
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<EntryRecord | null>(null);
  const [driverIdInput, setDriverIdInput] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<EntryRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchEntries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("entry_passes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEntries((data as EntryRecord[]) || []);
    } catch (err) {
      console.error("Error fetching entries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminLoading) fetchEntries();
  }, [adminLoading, fetchEntries]);

  const handleSubmit = useCallback(async () => {
    if (!driverIdInput.trim()) { toast.error("Please enter a Driver ID."); return; }
    if (!reason) { toast.error("Please select a reason for entry."); return; }

    setSubmitting(true);
    try {
      const { data: masterData } = await supabase
        .from("driver_master_file")
        .select("driver_name")
        .eq("driver_id", driverIdInput.trim())
        .maybeSingle();

      const { error } = await supabase.from("entry_passes").insert({
        entry_no: "TEMP",
        driver_id: driverIdInput.trim(),
        driver_name: masterData?.driver_name || null,
        reason,
        created_by: user?.id || null,
      });
      if (error) throw error;

      supabase.functions
        .invoke("send-entry-pass-notification", {
          body: { driverId: driverIdInput.trim(), driverName: masterData?.driver_name || null, reason },
        })
        .catch((err) => console.log("Entry pass notification failed (non-critical):", err));

      setDriverIdInput("");
      setReason("");
      setShowCreateForm(false);
      toast.success("Entry pass created successfully!");
      await fetchEntries();
    } catch (err: any) {
      toast.error(err.message || "Failed to create entry pass.");
    } finally {
      setSubmitting(false);
    }
  }, [driverIdInput, reason, user?.id, fetchEntries]);

  const handleUpdateStatus = useCallback(async (entry: EntryRecord, newStatus: string) => {
    try {
      const { error } = await supabase.from("entry_passes").update({ status: newStatus }).eq("id", entry.id);
      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      setSelectedEntry(null);
      await fetchEntries();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    }
  }, [fetchEntries]);

  const handleDelete = useCallback(async () => {
    if (!deleteEntry) return;
    try {
      const { error } = await supabase.from("entry_passes").delete().eq("id", deleteEntry.id);
      if (error) throw error;
      toast.success("Entry pass deleted.");
      setDeleteEntry(null);
      setSelectedEntry(null);
      await fetchEntries();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete entry pass.");
    }
  }, [deleteEntry, fetchEntries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch = !searchQuery ||
        e.driver_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.entry_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.driver_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [entries, searchQuery, statusFilter]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  return {
    isAdmin,
    adminLoading,
    loading,
    entries,
    filteredEntries,
    paginatedEntries,
    totalPages,
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedEntry,
    setSelectedEntry,
    driverIdInput,
    setDriverIdInput,
    reason,
    setReason,
    submitting,
    showCreateForm,
    setShowCreateForm,
    deleteEntry,
    setDeleteEntry,
    handleSubmit,
    handleUpdateStatus,
    handleDelete,
    ENTRY_REASONS,
    PAGE_SIZE,
  };
};
