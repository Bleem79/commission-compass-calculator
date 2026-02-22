import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Plus, ClipboardCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
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
  driverId: string;
  driverName: string | null;
  reason: string;
  createdAt: Date;
}

const DriverEntryPassPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { driverInfo, loading: driverLoading } = useDriverCredentials();
  const [reason, setReason] = useState("");
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<EntryRecord | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  // Live clock for the detail dialog
  useEffect(() => {
    if (!selectedEntry) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [selectedEntry]);

  const handleSubmit = () => {
    if (!reason) {
      toast.error("Please select a reason for entry.");
      return;
    }
    if (!driverInfo?.driverId) {
      toast.error("Driver ID not found.");
      return;
    }

    const newEntry: EntryRecord = {
      id: crypto.randomUUID(),
      driverId: driverInfo.driverId,
      driverName: driverInfo.driverName,
      reason,
      createdAt: new Date(),
    };

    setEntries((prev) => [newEntry, ...prev]);
    setReason("");
    toast.success("Entry pass created successfully!");
  };

  const driverName = selectedEntry?.driverName || "";
  const nameFontSize = driverName.length > 25 ? "0.875rem" : driverName.length > 18 ? "1rem" : "1.125rem";

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
              disabled={driverLoading || !reason}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit Entry Pass
            </Button>
          </div>

          {/* Entries List */}
          {entries.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white/80">Submitted Entries</h2>
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => { setSelectedEntry(entry); setNow(new Date()); }}
                  className="w-full text-left bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/10">
                        <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{entry.driverId}</p>
                        <p className="text-white/60 text-xs">{entry.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/60 text-xs">{format(entry.createdAt, "dd MMM yyyy")}</p>
                      <p className="text-white/50 text-xs">{format(entry.createdAt, "hh:mm:ss a")}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {entries.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-3">
              <ClipboardCheck className="w-12 h-12" />
              <p className="text-sm">No entry passes yet. Submit one above.</p>
            </div>
          )}
        </div>
      </div>

      {/* Entry Detail Dialog (styled like Driver ID Card) */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-[340px] sm:max-w-[380px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-center text-white text-lg font-bold tracking-wide">
              Entry Pass
            </DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="flex flex-col items-center gap-4">
              {/* QR Code */}
              <div className="p-1 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-400 to-cyan-500 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
                <div className="bg-white rounded-xl p-4 flex items-center justify-center">
                  <QRCodeCanvas
                    value={`ENTRY:${selectedEntry.driverId}|${selectedEntry.reason}|${selectedEntry.createdAt.toISOString()}`}
                    size={180}
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
                <p className="text-2xl font-bold tracking-wider text-white">{selectedEntry.driverId}</p>
              </div>

              {/* Driver Name */}
              {selectedEntry.driverName && (
                <div className="text-center space-y-1">
                  <p className="text-xs uppercase tracking-widest text-white/50">Full Name</p>
                  <p className="font-semibold text-white/90 break-words max-w-full px-2" style={{ fontSize: nameFontSize }}>
                    {selectedEntry.driverName}
                  </p>
                </div>
              )}

              {/* Reason */}
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-white/50">Reason of Entry</p>
                <p className="text-sm font-medium text-white/90 bg-white/10 rounded-lg px-4 py-2">{selectedEntry.reason}</p>
              </div>

              {/* Date & Time */}
              <div className="text-center space-y-0.5">
                <p className="text-xs uppercase tracking-widest text-white/50">Date & Time</p>
                <p className="text-sm font-medium text-white/80">{format(selectedEntry.createdAt, "dd MMM yyyy  •  hh:mm:ss a")}</p>
              </div>

              {/* Current Time */}
              <div className="text-center space-y-0.5">
                <p className="text-xs uppercase tracking-widest text-white/50">Current Time</p>
                <p className="text-sm font-medium text-white/80">{format(now, "dd MMM yyyy  •  hh:mm:ss a")}</p>
              </div>

              {/* Footer */}
              <div className="w-full flex items-center gap-3">
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
