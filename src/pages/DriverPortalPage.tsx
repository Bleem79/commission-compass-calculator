import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CalendarDays, 
  Target, 
  Ban, 
  MessageSquare,
  ArrowLeft,
  X,
  FileWarning,
  Clock,
  Mail,
  Droplets,
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DriverPrivateMessages } from "@/components/messages/DriverPrivateMessages";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { supabase } from "@/integrations/supabase/client";
import { usePushSubscriptionRegistration } from "@/hooks/usePushSubscriptionRegistration";

interface PortalSetting {
  feature_key: string;
  is_enabled: boolean;
}

const DriverPortalPage = () => {
  const navigate = useNavigate();
  const [showMessages, setShowMessages] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { unreadCount, markAllAsRead } = useUnreadMessages();
  const { driverInfo, loading: driverLoading } = useDriverCredentials();
  const [portalSettings, setPortalSettings] = useState<Record<string, boolean>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);

  usePushSubscriptionRegistration(user?.id, driverInfo?.driverId);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("driver_portal_settings")
          .select("feature_key, is_enabled");
        if (error) throw error;
        const settingsMap: Record<string, boolean> = {};
        data?.forEach((s: PortalSetting) => {
          settingsMap[s.feature_key] = s.is_enabled;
        });
        setPortalSettings(settingsMap);
      } catch (error) {
        console.error("Error fetching portal settings:", error);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleClose = () => navigate("/home");

  const showComingSoon = (feature: string) => {
    toast.info(`${feature} - Coming Soon!`, {
      description: "This feature is under development.",
      icon: <Clock className="w-5 h-5" />,
    });
  };

  const allPortalItems = [
    {
      key: "driver_income",
      icon: <CalendarDays className="w-7 h-7" />,
      title: "Driver Income",
      onClick: () => navigate("/driver-income"),
    },
    {
      key: "target_trips",
      icon: <Target className="w-7 h-7" />,
      title: "Target Trips",
      onClick: () => navigate("/driver-target-trips"),
    },
    {
      key: "absent_fine",
      icon: <Ban className="w-7 h-7" />,
      title: "Absent Fine",
      onClick: () => showComingSoon("Absent Fine"),
    },
    {
      key: "request",
      icon: <MessageSquare className="w-7 h-7" />,
      title: "Request",
      onClick: () => navigate("/driver-request"),
    },
    {
      key: "warning_letter",
      icon: <FileWarning className="w-7 h-7" />,
      title: "Warning Letter",
      onClick: () => showComingSoon("Warning Letter"),
    },
    {
      key: "private_messages",
      icon: <Mail className="w-7 h-7" />,
      title: "Private Messages",
      onClick: () => { markAllAsRead(); setShowMessages(true); },
      badge: unreadCount,
    },
    {
      key: "oil_change_booking",
      icon: <Droplets className="w-7 h-7" />,
      title: "Oil Change Booking",
      onClick: () => {
        if (driverLoading) { toast.info("Loading driver info, please wait..."); return; }
        if (!driverInfo?.driverId) { toast.error("Driver ID not found."); return; }
        const baseUrl = "https://oilchangeapp.lovable.app";
        const returnUrl = encodeURIComponent(window.location.origin + "/driver-portal");
        const url = `${baseUrl}?driver_id=${encodeURIComponent(driverInfo.driverId)}&redirect_url=${returnUrl}`;
        toast.success(`Opening Oil Change Booking for Driver ${driverInfo.driverId}`);
        window.location.href = url;
      },
    },
  ];

  const portalItems = loadingSettings
    ? allPortalItems
    : allPortalItems.filter(item => portalSettings[item.key] !== false);

  if (showMessages) {
    return <DriverPrivateMessages onBack={() => setShowMessages(false)} />;
  }

  return (
    <div className="min-h-screen bg-amber-400 relative flex flex-col">
      {/* Header bar */}
      <header className="bg-amber-500 px-4 py-4 flex items-center justify-between shadow-md">
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-white tracking-wide">Driver Portal</h1>
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Welcome section */}
      <div className="px-5 pt-6 pb-4">
        <div className="bg-white rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-2xl">🚕</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Welcome back,</p>
              <h2 className="text-xl font-bold text-gray-900">
                {user?.username || driverInfo?.driverId || "Driver"}
              </h2>
              {driverInfo?.driverId && (
                <p className="text-xs text-amber-600 font-semibold mt-0.5">
                  ID: {driverInfo.driverId}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Portal Grid */}
      <div className="flex-1 px-5 pb-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {portalItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className={cn(
                "group relative bg-white rounded-2xl p-5 shadow-md",
                "hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
                "transition-all duration-200 flex flex-col items-center gap-3",
                "min-h-[130px] sm:min-h-[150px]"
              )}
            >
              {/* Badge */}
              {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                <div className="absolute top-2 right-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                  <span className="text-[10px] font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-white flex items-center justify-center group-hover:bg-amber-500 transition-colors shadow-sm">
                {item.icon}
              </div>

              {/* Title */}
              <span className="text-sm font-semibold text-gray-800 text-center leading-tight">
                {item.title}
              </span>

              {/* Arrow */}
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-amber-500 py-4 px-5">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/lovable-uploads/aman-logo-footer.png"
            alt="Aman Taxi Sharjah"
            className="h-8 object-contain brightness-0 invert opacity-80"
          />
          <p className="text-[10px] text-white/70">© {new Date().getFullYear()} All Rights Reserved</p>
        </div>
      </footer>
    </div>
  );
};

export default DriverPortalPage;
