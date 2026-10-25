import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CalendarDays, 
  Target, 
  Ban, 
  MessageSquare,
  ArrowLeft,
  X,
  ChevronRight,
  FileWarning,
  Clock,
  Mail,
  Loader2,
  Droplets,
  ClipboardCheck,
  Video,
  DollarSign,
  CalendarRange,
  ClipboardList,
  Car
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { DriverPrivateMessages } from "@/components/messages/DriverPrivateMessages";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { supabase } from "@/integrations/supabase/client";
import { usePushSubscriptionRegistration } from "@/hooks/usePushSubscriptionRegistration";
import NotificationBell from "@/components/shared/NotificationBell";
import { usePrivateMessageAlert } from "@/hooks/usePrivateMessageAlert";
import { useUnreadMessageReminder } from "@/hooks/useUnreadMessageReminder";
import PayslipNoticeDialog from "@/components/shared/PayslipNoticeDialog";

interface PortalSetting {
  feature_key: string;
  is_enabled: boolean;
}

interface PortalCardProps {
  icon: React.ReactNode;
  title: string;
  gradient: string;
  onClick: () => void;
  badge?: number;
  alert?: boolean;
}

const PortalCard = ({ icon, title, gradient, onClick, badge, alert }: PortalCardProps) => (
  <button
    onClick={onClick}
    className={cn(
      "group relative overflow-hidden rounded-2xl p-6 sm:p-8 transition-all duration-300",
      "bg-white border border-slate-200 shadow-sm",
      "hover:scale-[1.02] hover:border-[#2b6cb0]/50 hover:shadow-[0_10px_30px_-10px_rgba(43,108,176,0.35)] active:scale-[0.98]",
      "flex flex-col items-center justify-center gap-4",
      "min-h-[160px] sm:min-h-[180px]",
      alert && "ring-2 ring-red-400 ring-offset-2 ring-offset-transparent animate-pulse"
    )}
  >
    {/* Badge */}
    {badge !== undefined && badge > 0 && (
      <div className="absolute top-3 right-3 z-20 min-w-[24px] h-6 px-2 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
        <span className="text-xs font-bold text-white">{badge > 99 ? "99+" : badge}</span>
      </div>
    )}

    {/* Icon container */}
    <div className={cn(
      "relative z-10 p-4 rounded-full text-white shadow-md group-hover:scale-110 transition-transform duration-300",
      gradient
    )}>
      <div className={cn(alert && "animate-bell-ring")}>{icon}</div>
    </div>

    {/* Title */}
    <h3 className="relative z-10 text-sm sm:text-base font-semibold text-center leading-tight text-slate-700">
      {title}
    </h3>
  </button>
);

const DriverPortalPage = () => {
  const navigate = useNavigate();
  const [showMessages, setShowMessages] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { unreadCount, markAllAsRead } = useUnreadMessages();
  const { driverInfo, loading: driverLoading } = useDriverCredentials();
  const { hasNewMessage, clearAlert } = usePrivateMessageAlert(driverInfo?.driverId);
  const openMessages = React.useCallback(() => {
    markAllAsRead();
    clearAlert();
    setShowMessages(true);
  }, [markAllAsRead, clearAlert]);
  useUnreadMessageReminder(unreadCount, openMessages, !showMessages);
  const [portalSettings, setPortalSettings] = useState<Record<string, boolean>>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [controllerName, setControllerName] = useState<string | null>(null);
  const [controllerAvatarUrl, setControllerAvatarUrl] = useState<string | null>(null);
  const [showPayslipNotice, setShowPayslipNotice] = useState(false);

  // Register push subscription when driver credentials are available
  usePushSubscriptionRegistration(user?.id, driverInfo?.driverId);

  // Fetch portal settings
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

  // Fetch controller name from driver_master_file
  useEffect(() => {
    const fetchController = async () => {
      if (!driverInfo?.driverId) return;
      try {
        const { data } = await supabase
          .from("driver_master_file")
          .select("controller")
          .eq("driver_id", driverInfo.driverId)
          .maybeSingle();
        const name = data?.controller || null;
        setControllerName(name);
        if (name) {
          try {
            const { data: funcData } = await supabase.functions.invoke("create-portal-user", {
              body: { action: "get_avatar", username: name },
            });
            if (funcData?.avatar_url) setControllerAvatarUrl(funcData.avatar_url);
          } catch {}
        }
      } catch (err) {
        console.error("Error fetching controller:", err);
      }
    };
    fetchController();
  }, [driverInfo?.driverId]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleClose = () => {
    navigate("/home");
  };

  const showComingSoon = (feature: string) => {
    toast.info(`${feature} - Coming Soon!`, {
      description: "This feature is under development and will be available soon.",
      icon: <Clock className="w-5 h-5" />,
    });
  };

  const allPortalItems = [
    {
      key: "safe_parking",
      icon: <Car className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Safe Parking",
      gradient: "bg-primary",
      onClick: () => navigate("/safe-parking"),
    },
    {
      key: "driver_income",
      icon: <CalendarDays className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Driver Income",
      gradient: "bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600",
      onClick: () => navigate("/driver-income"),
    },
    {
      key: "target_trips",
      icon: <Target className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Target Trips",
      gradient: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600",
      onClick: () => navigate("/driver-target-trips"),
    },
    {
      key: "absent_fine",
      icon: <Ban className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Absent Fine",
      gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500",
      onClick: () => showComingSoon("Absent Fine"),
    },
    {
      key: "request",
      icon: <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Request",
      gradient: "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500",
      onClick: () => navigate("/driver-request"),
    },
    {
      key: "warning_letter",
      icon: <FileWarning className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Booking Rejection",
      gradient: "bg-gradient-to-br from-red-600 via-rose-600 to-pink-600",
      onClick: () => navigate("/driver-warning-letter"),
    },
    {
      key: "private_messages",
      icon: <Mail className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Private Messages",
      gradient: "bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600",
      onClick: () => {
        markAllAsRead();
        clearAlert();
        setShowMessages(true);
      },
      badge: unreadCount,
      alert: hasNewMessage,
    },
    {
      key: "entry_pass",
      icon: <ClipboardCheck className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Entry Pass",
      gradient: "bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600",
      onClick: () => navigate("/driver-entry-pass"),
    },
    {
      key: "video_tutorials",
      icon: <Video className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Video Tutorials",
      gradient: "bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600",
      onClick: () => navigate("/video-tutorials"),
    },
    {
      key: "total_outstanding",
      icon: <DollarSign className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Total Balance",
      gradient: "bg-gradient-to-br from-red-500 via-rose-500 to-orange-600",
      onClick: () => navigate("/total-outstanding"),
    },
    {
      key: "oil_change_booking",
      icon: <Droplets className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Oil Change Booking",
      gradient: "bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600",
      onClick: () => {
        if (driverLoading) {
          toast.info("Loading driver info, please wait...");
          return;
        }
        
        if (!driverInfo?.driverId) {
          toast.error("Driver ID not found. Please try logging in again.");
          return;
        }
        
        const baseUrl = "https://oilchangeapp.lovable.app";
        const returnUrl = encodeURIComponent(window.location.origin + "/driver-portal");
        const url = `${baseUrl}?driver_id=${encodeURIComponent(driverInfo.driverId)}&redirect_url=${returnUrl}`;
        toast.success(`Opening Oil Change Booking for Driver ${driverInfo.driverId}`);
        window.location.href = url;
      },
    },
    {
      key: "outstanding",
      icon: <DollarSign className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Payslip",
      gradient: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
      onClick: () => setShowPayslipNotice(true),
    },
    {
      key: "calendar_events",
      icon: <CalendarRange className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Calendar Events",
      gradient: "bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-600",
      onClick: () => navigate("/driver-calendar-events"),
    },
    {
      key: "survey",
      icon: <ClipboardList className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Survey",
      gradient: "bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-600",
      onClick: () => navigate("/driver-survey"),
    },
    {
      key: "yango",
      icon: <Car className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Yango",
      gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-red-600",
      onClick: () => navigate("/driver-yango"),
    },
  ];

  // Filter items based on settings (if settings loaded, filter; otherwise show all)
  const portalItems = allPortalItems.filter(item =>
    item.key === "outstanding"
      ? !loadingSettings && portalSettings.outstanding === true
      : loadingSettings || portalSettings[item.key] !== false
  );

  // Show messages view if selected
  if (showMessages) {
    return <DriverPrivateMessages onBack={() => setShowMessages(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#eef2f6] relative overflow-hidden">
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navy header band */}
        <div className="bg-[#16324f] shadow-md pb-16">
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <header className="flex items-center justify-between gap-4 py-3 sm:py-4">
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:text-white"
                onClick={handleClose}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Home</span>
              </Button>

              <div className="flex items-center gap-2">
                <NotificationBell
                  driverId={driverInfo?.driverId}
                  count={unreadCount}
                  onClick={() => { markAllAsRead(); clearAlert(); setShowMessages(true); }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={handleClose}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </header>

            {/* Title */}
            <div className="text-center mt-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Driver Main Portal</h1>
              {user && (
                <p className="text-white/60 text-sm">
                  Welcome, {driverInfo?.driverName || driverInfo?.driverId || user.username || user.email}
                </p>
              )}
              {controllerName && (
                <p className="text-white/50 text-xs mt-1">
                  Revenue Controller In Charge:{" "}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="inline-flex items-center gap-2 align-middle text-white/80 font-medium underline decoration-dotted underline-offset-2 hover:text-white transition-colors">
                        <Avatar className="h-6 w-6 border border-white/30">
                        {controllerAvatarUrl ? (
                          <AvatarImage src={controllerAvatarUrl} alt={controllerName} />
                        ) : null}
                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                          {controllerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {controllerName}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" side="top">
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="h-20 w-20">
                        {controllerAvatarUrl ? (
                          <AvatarImage src={controllerAvatarUrl} alt={controllerName} />
                        ) : null}
                        <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                          {controllerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{controllerName}</span>
                      <span className="text-xs text-muted-foreground">Revenue Controller</span>
                    </div>
                  </PopoverContent>
                </Popover>
              </p>
            )}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col p-4 sm:p-6 lg:p-8 -mt-10">
          {/* Portal Cards Grid */}
          {unreadCount > 0 && (
            <button
              onClick={openMessages}
              className="mb-6 w-full flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left transition-colors hover:bg-red-100 shadow-sm"
            >
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                <Mail className="h-5 w-5 text-red-600 animate-bell-ring" />
                <span className="absolute inset-0 rounded-full bg-red-400/40 animate-ping" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold text-red-700">
                  {unreadCount === 1
                    ? "You have 1 unread message"
                    : `You have ${unreadCount} unread messages`}
                </span>
                <span className="block text-xs text-red-500">
                  Tap here to read your private messages from Admin.
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-red-400" />
            </button>
          )}

          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {portalItems.map((item, index) => (
                <PortalCard
                  key={index}
                  icon={item.icon}
                  title={item.title}
                  gradient={item.gradient}
                  onClick={item.onClick}
                  badge={'badge' in item ? item.badge : undefined}
                  alert={'alert' in item ? (item as { alert?: boolean }).alert : undefined}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex flex-col items-center gap-3">
              <img
                src="/lovable-uploads/aman-logo-footer.png"
                alt="Aman Taxi Sharjah"
                className="h-8 sm:h-10 object-contain opacity-70"
              />
              <p className="text-xs text-slate-400">© {new Date().getFullYear()} All Rights Reserved</p>
            </div>
          </footer>
        </div>
      </div>

      <PayslipNoticeDialog
        open={showPayslipNotice}
        onClose={() => setShowPayslipNotice(false)}
      />
    </div>
  );
};

export default DriverPortalPage;
