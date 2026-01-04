import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Bell, BellRing } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const NotificationPrompt = () => {
  const { isSupported, permission, requestPermission, isGranted, isDenied } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Don't show if not supported, already granted, or denied
    if (!isSupported || isGranted || isDenied) {
      return;
    }

    // Check if user dismissed recently (within 3 days)
    const dismissedAt = localStorage.getItem("notification-prompt-dismissed");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 3) {
        return;
      }
    }

    // Show after install banner (delay 8 seconds)
    const timer = setTimeout(() => setShowPrompt(true), 8000);
    return () => clearTimeout(timer);
  }, [isSupported, isGranted, isDenied]);

  const handleEnable = async () => {
    await requestPermission();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("notification-prompt-dismissed", new Date().toISOString());
  };

  if (!showPrompt || !isSupported || permission !== "default") return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-md mx-auto bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 shadow-lg shadow-orange-500/25 border border-amber-400/30">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <BellRing className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Enable Notifications</h3>
            <p className="text-white/80 text-xs mt-0.5">
              Get updates about your income reports and important announcements
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-1 text-white/80 hover:text-white hover:bg-white/10 text-xs"
          >
            Not now
          </Button>
          <Button
            size="sm"
            onClick={handleEnable}
            className="flex-1 bg-white text-orange-700 hover:bg-white/90 font-medium text-xs"
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            Enable
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPrompt;
