import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageLayout } from "@/components/shared/PageLayout";

const ENTRY_REASONS = [
  "Short Collection", "ADNOC Fuel Issue", "Fuel Chips Issue", "CNG Card Lost",
  "CNG Card Damage", "Customer Run Away", "Fine Removal", "Double Shift Partner Complaint",
  "Fuel bill Sign", "Customer pay to aman account", "Fuel Excess Inquiry",
  "Need to meet operation team", "Need to meet operations manager",
];

interface EntryRecord {
  id: string;
  entry_no: string;
  driver_id: string;
  driver_name: string | null;
  reason: string;
  status: string;
  created_at: string;
}

const DriverEntryPassPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, canAccessAdminPages } = useAuth();
  const { driverInfo, loading: driverLoading } = useDriverCredentials();
  const [reason, setReason] = useState("");
  const [driverIdInput, setDriverIdInput] = useState("");
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<EntryRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(true);

  const isStaff = canAccessAdminPages;

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const fetchEntries = useCallback(async () => {
    const driverId = isStaff ? null : driverInfo?.driverId;
    if (!isStaff && !driverId) return;
    try {
      let query = supabase.from("entry_passes").select("*").order("created_at", { ascending: false });
      if (!isStaff && driverId) query = query.eq("driver_id", driverId);
      const { data, error } = await query;
      if (error) throw error;
      setEntries((data as EntryRecord[]) || []);
    } catch (err) {
      console.error("Error fetching entries:", err);
    } finally {
      setLoadingEntries(false);
    }
  }, [driverInfo?.driverId, isStaff]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSubmit = async () => {
    if (!reason) { toast.error("Please select a reason for entry."); return; }
    const targetDriverId = isStaff ? driverIdInput.trim() : driverInfo?.driverId;
    if (!targetDriverId) { toast.error("Driver ID not found."); return; }

    setSubmitting(true);
    try {
      let driverName: string | null = isStaff ? null : (driverInfo?.driverName || null);
      if (isStaff) {
        const { data: masterData } = await supabase.from("driver_master_file").select("driver_name").eq("driver_id", targetDriverId).maybeSingle();
        driverName = masterData?.driver_name || null;
      }
      const { error } = await supabase.from("entry_passes").insert({
        entry_no: "TEMP", driver_id: targetDriverId, driver_name: driverName,
        reason, created_by: isStaff ? (user?.id || null) : null,
      });
      if (error) throw error;
      setReason("");
      setDriverIdInput("");
      toast.success("Entry pass created successfully!");
      supabase.functions.invoke("send-entry-pass-notification", {
        body: { driverId: targetDriverId, driverName, reason },
      }).catch((err) => console.log("Entry pass notification failed (non-critical):", err));
      await fetchEntries();
    } catch (err: any) {
      toast.error(err.message || "Failed to create entry pass.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done": return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Done</Badge>;
      default: return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Pending</Badge>;
    }
  };

  const selectedName = selectedEntry?.driver_name || "";
  const nameFontSize = selectedName.length > 25 ? "0.875rem" : selectedName.length > 18 ? "1rem" : "1.125rem";

  return (
    <PageLayout
      title="Entry Pass"
      icon={<ClipboardCheck className="h-6 w-6" />}
      backPath={isStaff ? "/home" : "/driver-portal"}
      backLabel="Back"
      maxWidth="2xl"
      variant="dark"
      gradient="from-slate-900 via-purple-900 to-slate-900"
    >
      {/* Form */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 sm:p-6 mb-6 space-y-4">
        {isStaff && (
          <div>
            <label className="text-sm text-white/70 mb-2 block">Driver ID</label>
            <Input value={driverIdInput} onChange={(e) => setDriverIdInput(e.target.value)} placeholder="Enter Driver ID" className="bg-white/10 border-white/20 text-white placeholder:text-white/40" />
          </div>
        )}
        <div>
          <label className="text-sm text-white/70 mb-2 block">Reason for Entry</label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white [&>span]:text-white">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-white/20 z-[100]">
              {ENTRY_REASONS.map((r) => (
                <SelectItem key={r} value={r} className="text-white focus:bg-white/20 focus:text-white">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSubmit} disabled={driverLoading || !reason || submitting || (isStaff && !driverIdInput.trim())} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          {submitting ? "Submitting..." : "Submit Entry Pass"}
        </Button>
      </div>

      {/* Entries List */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white/80">Submitted Entries</h2>
          {entries.map((entry) => (
            <button key={entry.id} onClick={() => setSelectedEntry(entry)} className="w-full text-left bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-colors group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10"><ClipboardCheck className="w-5 h-5 text-emerald-400" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">{entry.entry_no}</p>
                      {getStatusBadge(entry.status)}
                    </div>
                    <p className="text-white/60 text-xs">{entry.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-xs">{format(new Date(entry.created_at), "dd MMM yyyy")}</p>
                  <p className="text-white/50 text-xs">{format(new Date(entry.created_at), "hh:mm:ss a")}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {entries.length === 0 && !loadingEntries && (
        <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-3 py-12">
          <ClipboardCheck className="w-12 h-12" />
          <p className="text-sm">No entry passes yet. Submit one above.</p>
        </div>
      )}

      {/* Entry Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-[380px] sm:max-w-[420px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-center text-white text-xl font-bold tracking-wide">Entry Pass</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="flex flex-col items-center gap-5 py-2">
              <p className="text-lg font-bold tracking-wider text-emerald-400">{selectedEntry.entry_no}</p>
              <div className={`p-1 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.25)] ${selectedEntry.status === "done" ? "bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-500" : "bg-gradient-to-br from-amber-500 via-orange-400 to-yellow-500"}`}>
                <div className="bg-white rounded-xl p-4 flex items-center justify-center">
                  <QRCodeCanvas value={`ENTRY:${selectedEntry.entry_no}|${selectedEntry.driver_id}|${selectedEntry.reason}|${selectedEntry.created_at}`} size={200} level="L" bgColor="#ffffff" fgColor={selectedEntry.status === "done" ? "#10b981" : "#f97316"} includeMargin={true} />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-white/50">Driver ID</p>
                <p className="text-3xl font-bold tracking-wider text-white">{selectedEntry.driver_id}</p>
              </div>
              {selectedEntry.driver_name && (
                <div className="text-center space-y-1">
                  <p className="text-xs uppercase tracking-widest text-white/50">Full Name</p>
                  <p className="font-semibold text-white/90 break-words max-w-full px-2" style={{ fontSize: nameFontSize }}>{selectedEntry.driver_name}</p>
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
                <p className="text-base font-medium text-white/80">{format(new Date(selectedEntry.created_at), "dd MMM yyyy  •  hh:mm:ss a")}</p>
              </div>
              <div className="w-full flex items-center gap-3 pt-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/20" />
                <img src="/lovable-uploads/aman-logo-footer.png" alt="Aman" className="h-5 opacity-40" />
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/20" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default DriverEntryPassPage;
