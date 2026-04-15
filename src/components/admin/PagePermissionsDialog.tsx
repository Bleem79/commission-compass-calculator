import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock } from "lucide-react";

const ALL_PAGES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "commission-table", label: "Commission Table" },
  { key: "info", label: "Information" },
  { key: "m-fuel", label: "M-Fuel" },
  { key: "hotspot", label: "Hotspot" },
  { key: "cng-location", label: "CNG Locations" },
  { key: "driver-income", label: "Driver Income" },
  { key: "driver-management", label: "Driver Management" },
  { key: "driver-absent-fine", label: "Absent Fine Upload" },
  { key: "target-trips-upload", label: "Target Trips Upload" },
  { key: "warning-letters-upload", label: "Booking Rejection Upload" },
  { key: "admin-requests", label: "Driver Requests" },
  { key: "driver-activity-logs", label: "Activity Logs" },
  { key: "driver-master-file", label: "Driver Master File" },
  { key: "admin-entry-pass", label: "Entry Pass" },
  { key: "video-tutorials", label: "Video Tutorials" },
  { key: "total-outstanding", label: "Total Balance" },
  { key: "total-balance-kpi", label: "Total Balance KPI" },
];

interface PagePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
}

export const PagePermissionsDialog = ({ open, onOpenChange, userId, username }: PagePermissionsDialogProps) => {
  const [blockedPages, setBlockedPages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && userId) fetchPermissions();
  }, [open, userId]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke("create-portal-user", {
        body: { action: "get_permissions", user_id: userId },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      setBlockedPages(new Set(response.data.blocked_pages || []));
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load permissions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (pageKey: string) => {
    setBlockedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageKey)) next.delete(pageKey);
      else next.add(pageKey);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await supabase.functions.invoke("create-portal-user", {
        body: { action: "set_permissions", user_id: userId, blocked_pages: Array.from(blockedPages) },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Success", description: `Permissions updated for ${username}` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save permissions", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Page Access — {username}
          </DialogTitle>
          <DialogDescription>
            Uncheck pages to block access for this user. All pages are allowed by default.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {ALL_PAGES.map((page) => (
              <label
                key={page.key}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={!blockedPages.has(page.key)}
                  onCheckedChange={() => handleToggle(page.key)}
                />
                <span className={`text-sm font-medium ${blockedPages.has(page.key) ? "text-muted-foreground line-through" : ""}`}>
                  {page.label}
                </span>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-muted-foreground">
            {blockedPages.size === 0 ? "Full access" : `${blockedPages.size} page${blockedPages.size > 1 ? "s" : ""} blocked`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
