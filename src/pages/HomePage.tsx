import React, { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  ListCheck,
  Calculator,
  Bell,
  Info,
  Percent,
  Wifi,
  MapPin,
  CalendarDays,
  Users,
  LogOut,
  ChevronRight,
  Ban,
  Target,
  Upload,
  MessageSquare,
  MessageCircle,
  Activity,
  Settings2,
  FileSpreadsheet,
  ShieldCheck,
  ClipboardCheck,
  Video,
  FileText,
  BookOpen,
  DollarSign,
  TrendingUp,
  CalendarRange,
  Award,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePagePermissions } from "@/contexts/PagePermissionsContext";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePushSubscriptionRegistration } from "@/hooks/usePushSubscriptionRegistration";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { QrCode } from "lucide-react";

const DriverQRCodeDialog = lazy(() => import("@/components/driver-portal/DriverQRCodeDialog").then((m) => ({ default: m.DriverQRCodeDialog })));

// Lazy load heavy dialog components - only loaded when opened
const AdminMessages = lazy(() => import("@/components/messages/AdminMessages").then((m) => ({ default: m.AdminMessages })));
const DriverIncomeAuthDialog = lazy(() => import("@/components/driver-income/DriverIncomeAuthDialog").then((m) => ({ default: m.DriverIncomeAuthDialog })));
const DriverSmsDialog = lazy(() => import("@/components/messages/DriverSmsDialog").then((m) => ({ default: m.DriverSmsDialog })));
const DriverPortalSettingsDialog = lazy(() => import("@/components/admin/DriverPortalSettingsDialog").then((m) => ({ default: m.DriverPortalSettingsDialog })));
const InstallBanner = lazy(() => import("@/components/pwa/InstallBanner"));
const NotificationPrompt = lazy(() => import("@/components/pwa/NotificationPrompt"));
import NotificationBell from "@/components/shared/NotificationBell";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  gradient: string;
  onClick: () => void;
  className?: string;
  badge?: number;
}

type FeatureItem = FeatureCardProps & {
  pageKey?: string;
};

const FeatureCard = ({ icon, title, gradient, onClick, className, badge }: FeatureCardProps) => (
  <button
    onClick={onClick}
    className={cn(
      "group relative overflow-hidden rounded-2xl p-4 sm:p-6 text-white transition-all duration-300",
      "hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]",
      "flex flex-col items-center justify-center gap-2 sm:gap-3",
      "min-h-[100px] sm:min-h-[140px]",
      "backdrop-blur-sm border border-white/20",
      gradient,
      className
    )}
  >
    {badge !== undefined && badge > 0 && (
      <span className="absolute top-2 right-2 z-20 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-lg animate-pulse">
        {badge}
      </span>
    )}

    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

    <div className="relative z-10 p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
      {icon}
    </div>

    <h3 className="relative z-10 text-xs sm:text-sm font-semibold text-center leading-tight max-w-full">
      {title}
    </h3>

    <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-300 w-4 h-4 sm:w-5 sm:h-5" />
  </button>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isAdmin, canAccessAdminPages } = useAuth();
  const { isPageBlocked, loading: permissionsLoading } = usePagePermissions();
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDriverIncomeDialogOpen, setIsDriverIncomeDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [isPortalSettingsOpen, setIsPortalSettingsOpen] = useState(false);
  const [controllerName, setControllerName] = useState<string | null>(null);
  const [controllerAvatarUrl, setControllerAvatarUrl] = useState<string | null>(null);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [badgeImageUrl, setBadgeImageUrl] = useState<string | null>(null);
  const { driverInfo } = useDriverCredentials();
  const isDriver = !!driverInfo?.driverId;
  const shouldApplyPagePermissions = user?.role === "user" || user?.role === "advanced";
  const canAccessNotifications = !shouldApplyPagePermissions || !isPageBlocked("notifications");

  // Register push subscriptions for controllers (non-driver staff) so they receive request notifications
  usePushSubscriptionRegistration(user?.id, driverInfo?.driverId || null);

  // Fetch controller name for driver users
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

  // Fetch driver's latest badge image to display in the avatar slot
  useEffect(() => {
    let cancelled = false;
    const loadBadge = async () => {
      if (!driverInfo?.driverId) {
        setBadgeImageUrl(null);
        return;
      }
      try {
        const { data: badges } = await supabase
          .from("driver_badges")
          .select("badge_type")
          .eq("driver_id", driverInfo.driverId)
          .order("created_at", { ascending: false })
          .limit(1);
        if (cancelled) return;
        const latest = badges && badges[0];
        if (!latest) {
          setBadgeImageUrl(null);
          return;
        }
        const { data: catalog } = await supabase
          .from("driver_badge_catalog")
          .select("title, description, image_path");
        if (cancelled) return;
        const key = (latest.badge_type || "").trim().toLowerCase();
        const match = (catalog || []).find(
          (c) =>
            (c.title || "").trim().toLowerCase() === key ||
            (c.description || "").trim().toLowerCase() === key,
        );
        if (match?.image_path) {
          const { data } = supabase.storage.from("driver-badges").getPublicUrl(match.image_path);
          setBadgeImageUrl(data.publicUrl);
        } else {
          setBadgeImageUrl(null);
        }
      } catch (err) {
        console.error("Error fetching badge:", err);
        setBadgeImageUrl(null);
      }
    };
    loadBadge();
    return () => {
      cancelled = true;
    };
  }, [driverInfo?.driverId]);

  // Fetch pending driver request count for admin/advanced/users
  useEffect(() => {
    if (!canAccessAdminPages) return;
    const fetchPendingCount = async () => {
      try {
        const { count, error } = await supabase
          .from("driver_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        if (!error) setPendingRequestCount(count || 0);
      } catch (err) {
        console.error("Error fetching pending requests:", err);
      }
    };
    fetchPendingCount();

    const channel = supabase
      .channel("driver_requests_count")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_requests" }, () => {
        fetchPendingCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canAccessAdminPages]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Error in handleLogout:", error);
      toast({
        title: "Logout Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoggingOut(false);
      window.location.href = "/login";
    }
  }, [logout, isLoggingOut]);

  const features: FeatureItem[] = [
    {
      icon: <Calculator className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Commission Calculator",
      gradient: "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600",
      pageKey: "dashboard",
      onClick: () => navigate("/dashboard"),
    },
    {
      icon: <ListCheck className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Commission Table",
      gradient: "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500",
      pageKey: "commission-table",
      onClick: () => navigate("/commission-table"),
    },
    {
      icon: <Percent className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "M-fuel %",
      gradient: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600",
      pageKey: "m-fuel",
      onClick: () => navigate("/m-fuel"),
    },
    {
      icon: <Wifi className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Hotspot",
      gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500",
      pageKey: "hotspot",
      onClick: () => navigate("/hotspot"),
    },
    {
      icon: <Info className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Info",
      gradient: "bg-gradient-to-br from-pink-500 via-rose-500 to-red-500",
      pageKey: "info",
      onClick: () => navigate("/info"),
    },
    {
      icon: <Bell className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Notifications",
      gradient: "bg-gradient-to-br from-fuchsia-500 via-purple-500 to-violet-600",
      pageKey: "notifications",
      onClick: () => setIsMessagesOpen(true),
    },
    {
      icon: <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "CNG Location",
      gradient: "bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600",
      pageKey: "cng-location",
      onClick: () => navigate("/cng-location"),
    },
    {
      icon: <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: isAdmin || canAccessAdminPages ? "Driver Income" : "Driver Main Portal",
      gradient: "bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600",
      pageKey: "driver-income",
      onClick: () => {
        if (isAdmin || canAccessAdminPages) {
          navigate("/driver-income");
        } else if (isDriver) {
          navigate("/driver-portal");
        } else {
          setIsDriverIncomeDialogOpen(true);
        }
      },
    },
  ];

  const isFleetUser = user?.email?.toLowerCase() === "fleet@amantaxi.com";

  if (canAccessAdminPages && !isFleetUser) {
    features.push({
      icon: <Users className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Driver Management",
      gradient: "bg-gradient-to-br from-slate-600 via-gray-600 to-zinc-700",
      pageKey: "driver-management",
      onClick: () => navigate("/driver-management"),
    });
    features.push({
      icon: <Target className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Target Trips",
      gradient: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
      pageKey: "target-trips-upload",
      onClick: () => navigate("/target-trips-upload"),
    });
    features.push({
      icon: <Ban className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Drivers Absent Fine",
      gradient: "bg-gradient-to-br from-red-600 via-rose-600 to-pink-700",
      pageKey: "driver-absent-fine",
      onClick: () => navigate("/driver-absent-fine"),
    });
    features.push({
      icon: <Upload className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Booking Rejection",
      gradient: "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600",
      pageKey: "warning-letters-upload",
      onClick: () => navigate("/warning-letters-upload"),
    });
    features.push({
      icon: <DollarSign className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Total Balance",
      gradient: "bg-gradient-to-br from-red-500 via-rose-500 to-orange-600",
      pageKey: "total-outstanding",
      onClick: () => navigate("/total-outstanding"),
    });
    features.push({
      icon: <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Balance KPI",
      gradient: "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600",
      pageKey: "total-balance-kpi",
      onClick: () => navigate("/total-balance-kpi"),
    });
  }

  if (canAccessAdminPages) {
    features.push({
      icon: <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Driver Requests",
      gradient: "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700",
      pageKey: "admin-requests",
      onClick: () => navigate("/admin-requests"),
      badge: pendingRequestCount,
    });
  }

  if (canAccessAdminPages && !isFleetUser) {
    features.push({
      icon: <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "SMS",
      gradient: "bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600",
      pageKey: "sms",
      onClick: () => setIsSmsDialogOpen(true),
    });
    features.push({
      icon: <Activity className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Activity Logs",
      gradient: "bg-gradient-to-br from-gray-600 via-slate-600 to-zinc-700",
      pageKey: "driver-activity-logs",
      onClick: () => navigate("/driver-activity-logs"),
    });
    features.push({
      icon: <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Driver Master File",
      gradient: "bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-700",
      pageKey: "driver-master-file",
      onClick: () => navigate("/driver-master-file"),
    });
    features.push({
      icon: <ClipboardCheck className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Entry Pass",
      gradient: "bg-gradient-to-br from-teal-500 via-emerald-500 to-green-600",
      pageKey: "admin-entry-pass",
      onClick: () => navigate("/admin-entry-pass"),
    });
    features.push({
      icon: <Video className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Video Tutorials",
      gradient: "bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600",
      pageKey: "video-tutorials",
      onClick: () => navigate("/video-tutorials"),
    });
    features.push({
      icon: <CalendarRange className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Calendar Events",
      gradient: "bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-600",
      pageKey: "calendar-events-upload",
      onClick: () => navigate("/calendar-events-upload"),
    });
    features.push({
      icon: <Award className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Driver Badge",
      gradient: "bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-600",
      pageKey: "driver-badge",
      onClick: () => navigate("/driver-badge"),
    });
    if (isAdmin) {
      features.push({
        icon: <Settings2 className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "Portal Settings",
        gradient: "bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700",
        onClick: () => setIsPortalSettingsOpen(true),
      });
      features.push({
        icon: <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "Revenue Controller Portal",
        gradient: "bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600",
        onClick: () => navigate("/revenue-controller-portal"),
      });
      features.push({
        icon: <FileText className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "PRD Document",
        gradient: "bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-700",
        onClick: () => navigate("/prd"),
      });
      features.push({
        icon: <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "System Guide",
        gradient: "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700",
        onClick: () => navigate("/system-guide"),
      });
    }
  }

  const visibleFeatures = shouldApplyPagePermissions
    ? features.filter((feature) => !feature.pageKey || !isPageBlocked(feature.pageKey))
    : features;

  if (shouldApplyPagePermissions && permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
          <header className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <img src="/lovable-uploads/aman-logo-footer.png" alt="Aman Taxi" className="h-6 sm:h-8 object-contain" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-white">Driver Portal</h1>
                <p className="text-xs sm:text-sm text-white/60">Welcome back</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canAccessNotifications && <NotificationBell onClick={() => setIsMessagesOpen(true)} />}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={cn(
                  "flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                  "bg-white/10 backdrop-blur-sm border border-white/20 text-white",
                  "hover:bg-red-500/80 hover:border-red-400",
                  isLoggingOut && "opacity-50 cursor-not-allowed"
                )}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </button>
            </div>
          </header>

          {user && (
            <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <div className="flex items-center gap-4">
                {driverInfo?.driverId ? (
                  <button
                    onClick={() => setIsQRCodeOpen(true)}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white transition-colors hover:opacity-90 active:scale-95 shrink-0"
                    title="Show QR Code"
                  >
                    <QrCode className="w-8 h-8 sm:w-9 sm:h-9" />
                  </button>
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl shrink-0">
                    {(user.username || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-semibold text-base sm:text-lg truncate">
                      {driverInfo?.driverId || user.username || user.email}
                    </h2>
                  </div>
                  <p className="text-white/60 text-xs sm:text-sm truncate">
                    {driverInfo?.driverName || (user.email?.endsWith("@driver.temp") ? "" : user.email)}
                  </p>
                </div>
                {controllerName && (
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-white/20">
                      {controllerAvatarUrl ? <AvatarImage src={controllerAvatarUrl} alt={controllerName} /> : null}
                      <AvatarFallback className="text-lg bg-primary/20 text-primary">
                        {controllerName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] text-white/50">Revenue Controller</span>
                    <span className="text-[11px] text-white/80 font-medium max-w-[100px] text-center truncate">{controllerName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1">
            <h2 className="text-white/80 text-sm font-medium mb-4 uppercase tracking-wider">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {visibleFeatures.map((feature) => (
                <FeatureCard
                  key={feature.title}
                  icon={feature.icon}
                  title={feature.title}
                  gradient={feature.gradient}
                  onClick={feature.onClick}
                  badge={feature.badge}
                />
              ))}
            </div>
          </div>

          <footer className="mt-8 sm:mt-12 pt-6 border-t border-white/10">
            <div className="flex flex-col items-center gap-3">
              <img src="/lovable-uploads/aman-logo-footer.png" alt="Aman Taxi Sharjah" className="h-8 sm:h-10 object-contain opacity-70" />
              <p className="text-xs text-white/40">© {new Date().getFullYear()} All Rights Reserved</p>
            </div>
          </footer>
        </div>
      </div>

      <Suspense fallback={null}>
        {canAccessNotifications && isMessagesOpen && (
          <AdminMessages isOpen={isMessagesOpen} onClose={() => setIsMessagesOpen(false)} />
        )}
        {isDriverIncomeDialogOpen && (
          <DriverIncomeAuthDialog isOpen={isDriverIncomeDialogOpen} onClose={() => setIsDriverIncomeDialogOpen(false)} />
        )}
        {isSmsDialogOpen && <DriverSmsDialog isOpen={isSmsDialogOpen} onClose={() => setIsSmsDialogOpen(false)} />}
        {isPortalSettingsOpen && (
          <DriverPortalSettingsDialog open={isPortalSettingsOpen} onOpenChange={setIsPortalSettingsOpen} />
        )}
        {isQRCodeOpen && driverInfo?.driverId && (
          <DriverQRCodeDialog
            isOpen={isQRCodeOpen}
            onClose={() => setIsQRCodeOpen(false)}
            driverId={driverInfo.driverId}
            driverName={driverInfo.driverName}
          />
        )}
        <InstallBanner />
        <NotificationPrompt />
      </Suspense>
    </div>
  );
};

export default HomePage;
