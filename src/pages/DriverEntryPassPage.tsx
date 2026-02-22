import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Plus, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ENTRY_REASONS = [
  "Vehicle Inspection",
  "Document Submission",
  "Office Visit",
  "Vehicle Maintenance",
  "Fuel Card Collection",
  "Uniform Collection",
  "Meeting",
  "Training",
  "Complaint / Issue",
  "Other",
];

interface EntryRecord {
  id: string;
  entry_no: string;
  driver_id: string;
  driver_name: string | null;
  reason: string;
  created_at: string;
}

const DriverEntryPassPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { driverInfo, loading: driverLoading } = useDriverCredentials();
  const [reason, setReason] = useState("");
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<EntryRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const fetchEntries = useCallback(async () => {
    if (!driverInfo?.driverId) return;
    try {
      const { data, error } = await supabase
        .from("entry_passes")
        .select("*")
        .eq("driver_id", driverInfo.driverId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEntries((data as EntryRecord[]) || []);
    } catch (err) {
      console.error("Error fetching entries:", err);
    } finally {
      setLoadingEntries(false);
    }
  }, [driverInfo?.driverId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select a reason for entry.");
      return;
    }
    if (!driverInfo?.driverId) {
      toast.error("Driver ID not found.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("entry_passes").insert({
        entry_no: "TEMP", // will be overwritten by trigger
        driver_id: driverInfo.driverId,
        driver_name: driverInfo.driverName,
        reason,
      });
      if (error) throw error;

      setReason("");
      toast.success("Entry pass created successfully!");
      await fetchEntries();
    } catch (err: any) {
      toast.error(err.message || "Failed to create entry pass.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedName = selectedEntry?.driver_name || "";
  const nameFontSize = selectedName.length > 25 ? "0.875rem" : selectedName.length > 18 ? "1rem" : "1.125rem";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <header className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              onClick={() => navigate("/driver-portal")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </header>

          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6">Entry Pass</h1>

          {/* Form */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 sm:p-6 mb-6 space-y-4">
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
              disabled={driverLoading || !reason || submitting}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Entry Pass"}
            </Button>
          </div>

          {/* Entries List */}
          {entries.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white/80">Submitted Entries</h2>
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="w-full text-left bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/10">
                        <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{entry.entry_no}</p>
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
            <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-3">
              <ClipboardCheck className="w-12 h-12" />
              <p className="text-sm">No entry passes yet. Submit one above.</p>
            </div>
          )}
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
              {/* Entry Pass No */}
              <div className="text-center">
                <p className="text-lg font-bold tracking-wider text-emerald-400">{selectedEntry.entry_no}</p>
              </div>

              {/* QR Code */}
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

              {/* Driver ID */}
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-white/50">Driver ID</p>
                <p className="text-3xl font-bold tracking-wider text-white">{selectedEntry.driver_id}</p>
              </div>

              {/* Driver Name */}
              {selectedEntry.driver_name && (
                <div className="text-center space-y-1">
                  <p className="text-xs uppercase tracking-widest text-white/50">Full Name</p>
                  <p className="font-semibold text-white/90 break-words max-w-full px-2" style={{ fontSize: nameFontSize }}>
                    {selectedEntry.driver_name}
                  </p>
                </div>
              )}

              {/* Reason */}
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-white/50">Reason of Entry</p>
                <p className="text-base font-medium text-white/90 bg-white/10 rounded-lg px-5 py-2.5">{selectedEntry.reason}</p>
              </div>

              {/* Date & Time */}
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-white/50">Date & Time</p>
                <p className="text-base font-medium text-white/80">
                  {format(new Date(selectedEntry.created_at), "dd MMM yyyy  •  hh:mm:ss a")}
                </p>
              </div>

              {/* Footer */}
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

export default DriverEntryPassPage;
