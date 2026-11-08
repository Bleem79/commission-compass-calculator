import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Settings2, X } from "lucide-react";

interface PortalSetting {
  id: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
}

interface DriverPortalSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DriverPortalSettingsDialog = ({ open, onOpenChange }: DriverPortalSettingsDialogProps) => {
  const [settings, setSettings] = useState<PortalSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      fetchSettings();
    } else {
      setSearch("");
    }
  }, [open]);

  const enabledCount = settings.filter((s) => s.is_enabled).length;
  const visibleSettings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? settings.filter((s) => s.feature_name.toLowerCase().includes(term)) : settings;
  }, [settings, search]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("driver_portal_settings")
        .select("*")
        .order("feature_name");

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (setting: PortalSetting) => {
    setSaving(setting.id);
    try {
      const { error } = await supabase
        .from("driver_portal_settings")
        .update({ 
          is_enabled: !setting.is_enabled,
          updated_at: new Date().toISOString()
        })
        .eq("id", setting.id);

      if (error) throw error;

      setSettings(prev => 
        prev.map(s => 
          s.id === setting.id ? { ...s, is_enabled: !s.is_enabled } : s
        )
      );

      toast.success(`${setting.feature_name} ${!setting.is_enabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    } finally {
      setSaving(null);
    }
  };

  const featureIcons: Record<string, string> = {
    safe_parking: "🅿️",
    driver_income: "📊",
    target_trips: "🎯",
    absent_fine: "⚠️",
    request: "📝",
    warning_letter: "📄",
    private_messages: "💬",
    oil_change_booking: "🛢️",
    entry_pass: "🎫",
    video_tutorials: "🎬",
    survey: "📋",
    sms: "📱",
    yango: "🚕",
    outstanding: "💲",
    total_outstanding: "💰",
    calendar_events: "📅",
    driver_training: "🎓",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Driver Portal Settings
          </DialogTitle>
          <DialogDescription>
            Enable or disable features visible to drivers in their portal.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{enabledCount}</span> of {settings.length} features on
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search features..."
                className="pl-9 pr-10 h-11"
                aria-label="Search features"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[55vh] overflow-y-auto overscroll-contain space-y-3 py-2 pr-1 -mr-1">
            {visibleSettings.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No features match your search.</p>
            )}
            {visibleSettings.map((setting) => (
              <div 
                key={setting.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{featureIcons[setting.feature_key] || "📌"}</span>
                  <Label htmlFor={setting.id} className="font-medium cursor-pointer">
                    {setting.feature_name}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  {saving === setting.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    id={setting.id}
                    checked={setting.is_enabled}
                    onCheckedChange={() => handleToggle(setting)}
                    disabled={saving === setting.id}
                  />
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
