import React, { useEffect, useState } from "react";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; canEdit: boolean; }

export const BlockDriverRequestsDialog = ({ open, onOpenChange, canEdit }: Props) => {
  const db = supabase as any;
  const [driverId, setDriverId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const load = async () => {
    const [b, h] = await Promise.all([
      db.from("driver_request_blocks").select("*").eq("is_blocked", true).order("updated_at", { ascending: false }),
      db.from("driver_request_block_history").select("*").order("changed_at", { ascending: false }).limit(200),
    ]);
    setBlocked(b.data || []);
    setHistory(h.data || []);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const setBlock = async (id: string, isBlocked: boolean) => {
    const d = id.trim();
    if (!d) return toast.error("Enter a Driver ID");
    setSaving(true);
    const { error } = await db.from("driver_request_blocks").upsert({
      driver_id: d, is_blocked: isBlocked, reason: reason.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Driver ${d} ${isBlocked ? "blocked" : "unblocked"}`);
    setDriverId(""); setReason("");
    load();
  };

  const fmt = (s: string) => new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-destructive" />Block / Unblock Driver Requests</DialogTitle></DialogHeader>

        {canEdit && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="Driver ID" value={driverId} onChange={(e) => setDriverId(e.target.value)} className="min-h-11" />
              <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-11" />
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1 min-h-11" disabled={saving} onClick={() => setBlock(driverId, true)}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}Block
              </Button>
              <Button variant="outline" className="flex-1 min-h-11" disabled={saving} onClick={() => setBlock(driverId, false)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />Unblock
              </Button>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-sm mb-2">Currently Blocked ({blocked.length})</h3>
          {blocked.length === 0 ? <p className="text-sm text-muted-foreground">No blocked drivers.</p> : (
            <div className="space-y-2">
              {blocked.map((b) => (
                <div key={b.driver_id} className="flex items-center justify-between gap-2 border rounded-md p-2">
                  <div className="min-w-0">
                    <p className="font-medium">{b.driver_id}</p>
                    {b.reason && <p className="text-xs text-muted-foreground truncate">{b.reason}</p>}
                  </div>
                  {canEdit && <Button size="sm" variant="outline" className="min-h-11" onClick={() => setBlock(b.driver_id, false)}>Unblock</Button>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-2">History</h3>
          {history.length === 0 ? <p className="text-sm text-muted-foreground">No history yet.</p> : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="border rounded-md p-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{h.driver_id}</span>
                    <Badge variant={h.action === "blocked" ? "destructive" : "secondary"}>{h.action === "blocked" ? "Blocked" : "Unblocked"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{fmt(h.changed_at)} by {h.changed_by_name || "Unknown"}</p>
                  {h.reason && <p className="text-xs">Reason: {h.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
