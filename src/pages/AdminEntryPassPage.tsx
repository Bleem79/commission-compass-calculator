import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, ClipboardCheck, Search, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
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

interface EntryRecord {
  id: string;
  entry_no: string;
  driver_id: string;
  driver_name: string | null;
  reason: string;
  status: string;
  created_at: string;
  created_by: string | null;
}

const AdminEntryPassPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck(false);
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<EntryRecord | null>(null);

  // Staff creation form
  const [driverIdInput, setDriverIdInput] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

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

  const handleSubmit = async () => {
    if (!driverIdInput.trim()) {
      toast.error("Please enter a Driver ID.");
      return;
    }
    if (!reason) {
      toast.error("Please select a reason for entry.");
      return;
    }

    setSubmitting(true);
    try {
      // Look up driver name from master file
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
  };

  const handleUpdateStatus = async (entry: EntryRecord, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("entry_passes")
        .update({ status: newStatus })
        .eq("id", entry.id);
      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      setSelectedEntry(null);
      await fetchEntries();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      !searchQuery ||
      e.driver_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.entry_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.driver_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Done</Badge>;
      case "pending":
      default:
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>;
    }
  };

  const selectedName = selectedEntry?.driver_name || "";
  const nameFontSize = selectedName.length > 25 ? "0.875rem" : selectedName.length > 18 ? "1rem" : "1.125rem";

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <header className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              onClick={() => navigate("/home")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </header>

          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6">Entry Pass Management</h1>

          {/* Create Entry Pass Button */}
          <div className="mb-4">
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Entry Pass
            </Button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 sm:p-6 mb-6 space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-2 block">Driver ID</label>
                <Input
                  value={driverIdInput}
                  onChange={(e) => setDriverIdInput(e.target.value)}
                  placeholder="Enter Driver ID"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Reason for Entry</label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white [&>span]:text-white">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/20 z-[100]">
                    {ENTRY_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-white focus:bg-white/20 focus:text-white">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!driverIdInput.trim() || !reason || submitting}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                {submitting ? "Submitting..." : "Submit Entry Pass"}
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Driver ID, Entry No, Name..."
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] bg-white/10 border-white/20 text-white [&>span]:text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-white/20 z-[100]">
                <SelectItem value="all" className="text-white focus:bg-white/20 focus:text-white">All Status</SelectItem>
                <SelectItem value="pending" className="text-white focus:bg-white/20 focus:text-white">Pending</SelectItem>
                <SelectItem value="done" className="text-white focus:bg-white/20 focus:text-white">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entries List */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white/80">
              All Entries ({filteredEntries.length})
            </h2>
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="w-full text-left bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/10">
                      <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm">{entry.entry_no}</p>
                        {getStatusBadge(entry.status)}
                      </div>
                      <p className="text-white/60 text-xs">{entry.driver_id} — {entry.reason}</p>
                      {entry.driver_name && (
                        <p className="text-white/40 text-xs">{entry.driver_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-xs">{format(new Date(entry.created_at), "dd MMM yyyy")}</p>
                    <p className="text-white/50 text-xs">{format(new Date(entry.created_at), "hh:mm:ss a")}</p>
                  </div>
                </div>
              </button>
            ))}

            {filteredEntries.length === 0 && (
              <div className="flex flex-col items-center justify-center text-white/40 gap-3 py-12">
                <ClipboardCheck className="w-12 h-12" />
                <p className="text-sm">No entry passes found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Entry Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-[380px] sm:max-w-[420px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-center text-white text-xl font-bold tracking-wide">
              Entry Pass
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="text-center">
                <p className="text-lg font-bold tracking-wider text-emerald-400">{selectedEntry.entry_no}</p>
              </div>

              <div className="p-1 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-500 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
                <div className="bg-white rounded-xl p-4 flex items-center justify-center">
                  <QRCodeCanvas
                    value={`ENTRY:${selectedEntry.entry_no}|${selectedEntry.driver_id}|${selectedEntry.reason}|${selectedEntry.created_at}`}
                    size={200}
                    level="L"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    includeMargin={true}
                  />
                </div>
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-white/50">Driver ID</p>
                <p className="text-3xl font-bold tracking-wider text-white">{selectedEntry.driver_id}</p>
              </div>

              {selectedEntry.driver_name && (
                <div className="text-center space-y-1">
                  <p className="text-xs uppercase tracking-widest text-white/50">Full Name</p>
                  <p className="font-semibold text-white/90 break-words max-w-full px-2" style={{ fontSize: nameFontSize }}>
                    {selectedEntry.driver_name}
                  </p>
                </div>
              )}

              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-white/50">Reason of Entry</p>
                <p className="text-base font-medium text-white/90 bg-white/10 rounded-lg px-5 py-2.5">{selectedEntry.reason}</p>
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-white/50">Status</p>
                <div>{getStatusBadge(selectedEntry.status)}</div>
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-white/50">Date & Time</p>
                <p className="text-base font-medium text-white/80">
                  {format(new Date(selectedEntry.created_at), "dd MMM yyyy  •  hh:mm:ss a")}
                </p>
              </div>

              {/* Admin status update buttons */}
              {isAdmin && (
                <div className="w-full flex gap-2 pt-2">
                  {selectedEntry.status !== "done" && (
                    <Button
                      onClick={() => handleUpdateStatus(selectedEntry, "done")}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Mark as Done
                    </Button>
                  )}
                  {selectedEntry.status !== "pending" && (
                    <Button
                      onClick={() => handleUpdateStatus(selectedEntry, "pending")}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Mark as Pending
                    </Button>
                  )}
                </div>
              )}

              <div className="w-full flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/20" />
                <img src="/lovable-uploads/aman-logo-footer.png" alt="Aman" className="h-5 opacity-40" />
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/20" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEntryPassPage;
