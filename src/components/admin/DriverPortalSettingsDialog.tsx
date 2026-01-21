import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Settings2 } from "lucide-react";

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

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

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
    driver_income: "📊",
    target_trips: "🎯",
    absent_fine: "⚠️",
    request: "📝",
    warning_letter: "📄",
    private_messages: "💬",
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
          <div className="space-y-4 py-4">
            {settings.map((setting) => (
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
