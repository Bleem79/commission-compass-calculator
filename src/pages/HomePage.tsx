import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  ShieldCheck
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminMessages } from "@/components/messages/AdminMessages";
import { DriverIncomeAuthDialog } from "@/components/driver-income/DriverIncomeAuthDialog";
import { DriverSmsDialog } from "@/components/messages/DriverSmsDialog";
import { DriverPortalSettingsDialog } from "@/components/admin/DriverPortalSettingsDialog";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { supabase } from "@/integrations/supabase/client";
import InstallBanner from "@/components/pwa/InstallBanner";
import NotificationPrompt from "@/components/pwa/NotificationPrompt";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePushSubscriptionRegistration } from "@/hooks/usePushSubscriptionRegistration";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  gradient: string;
  onClick: () => void;
  className?: string;
}

const FeatureCard = ({ icon, title, gradient, onClick, className }: FeatureCardProps) => (
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
    {/* Shimmer effect */}
    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    
    {/* Icon container */}
    <div className="relative z-10 p-2 sm:p-3 rounded-xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
      {icon}
    </div>
    
    {/* Title */}
    <h3 className="relative z-10 text-xs sm:text-sm font-semibold text-center leading-tight max-w-full">
      {title}
    </h3>
    
    {/* Arrow indicator */}
    <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-300 w-4 h-4 sm:w-5 sm:h-5" />
  </button>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isAdmin, isAdvanced, canAccessAdminPages } = useAuth();
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDriverIncomeDialogOpen, setIsDriverIncomeDialogOpen] = useState(false);
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [isPortalSettingsOpen, setIsPortalSettingsOpen] = useState(false);
  const [controllerName, setControllerName] = useState<string | null>(null);
  const { driverInfo } = useDriverCredentials();
  const isDriver = !!driverInfo?.driverId;

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
        setControllerName(data?.controller || null);
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
        variant: "destructive"
      });
      setIsLoggingOut(false);
      window.location.href = "/login";
    }
  }, [logout, isLoggingOut]);

  const features = [
    {
      icon: <Calculator className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Commission Calculator",
      gradient: "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600",
      onClick: () => navigate("/dashboard"),
    },
    {
      icon: <ListCheck className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Commission Table",
      gradient: "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500",
      onClick: () => navigate("/commission-table"),
    },
    {
      icon: <Percent className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "M-fuel %",
      gradient: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600",
      onClick: () => navigate("/m-fuel"),
    },
    {
      icon: <Wifi className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Hotspot",
      gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500",
      onClick: () => navigate("/hotspot"),
    },
    {
      icon: <Info className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Info",
      gradient: "bg-gradient-to-br from-pink-500 via-rose-500 to-red-500",
      onClick: () => navigate("/info"),
    },
    {
      icon: <Bell className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Notifications",
      gradient: "bg-gradient-to-br from-fuchsia-500 via-purple-500 to-violet-600",
      onClick: () => setIsMessagesOpen(true),
    },
    {
      icon: <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "CNG Location",
      gradient: "bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600",
      onClick: () => navigate("/cng-location"),
    },
    ...(isAdvanced ? [] : [{
      icon: <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: isAdmin ? "Driver Income" : "Driver Main Portal",
      gradient: "bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600",
      onClick: () => {
        if (isAdmin) {
          navigate("/driver-income");
        } else if (isDriver) {
          navigate("/driver-portal");
        } else {
          setIsDriverIncomeDialogOpen(true);
        }
      },
    }]),
  ];

  if (canAccessAdminPages) {
    if (isAdmin) {
      features.push({
        icon: <Users className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "Driver Management",
        gradient: "bg-gradient-to-br from-slate-600 via-gray-600 to-zinc-700",
        onClick: () => navigate("/driver-management"),
      });
      features.push({
        icon: <Ban className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "Drivers Absent Fine",
        gradient: "bg-gradient-to-br from-red-600 via-rose-600 to-pink-700",
        onClick: () => navigate("/driver-absent-fine"),
      });
      features.push({
        icon: <Target className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "Target Trips Upload",
        gradient: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
        onClick: () => navigate("/target-trips-upload"),
      });
      features.push({
        icon: <Upload className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "Warning Letters",
        gradient: "bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600",
        onClick: () => navigate("/warning-letters-upload"),
      });
    }
    features.push({
      icon: <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Driver Requests",
      gradient: "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700",
      onClick: () => navigate("/admin-requests"),
    });
    features.push({
      icon: <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "SMS",
      gradient: "bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600",
      onClick: () => setIsSmsDialogOpen(true),
    });
    features.push({
      icon: <Activity className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Activity Logs",
      gradient: "bg-gradient-to-br from-gray-600 via-slate-600 to-zinc-700",
      onClick: () => navigate("/driver-activity-logs"),
    });
    if (isAdmin) {
      features.push({
        icon: <Settings2 className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "Portal Settings",
        gradient: "bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700",
        onClick: () => setIsPortalSettingsOpen(true),
      });
      features.push({
        icon: <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "Driver Master File",
        gradient: "bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-700",
        onClick: () => navigate("/driver-master-file"),
      });
      features.push({
        icon: <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8" />,
        title: "Revenue Controller Portal",
        gradient: "bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-600",
        onClick: () => navigate("/revenue-controller-portal"),
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
          
          {/* Header */}
          <header className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                <img 
                  src="/lovable-uploads/aman-logo-footer.png" 
                  alt="Aman Taxi" 
                  className="h-6 sm:h-8 object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-white">Driver Portal</h1>
                <p className="text-xs sm:text-sm text-white/60">Welcome back</p>
              </div>
            </div>
            
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
              <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </header>

          {/* User Profile Card */}
          {user && (
            <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                  {(user.username || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-semibold text-base sm:text-lg truncate">
                    {user.username || user.email}
                  </h2>
                  <p className="text-white/60 text-xs sm:text-sm truncate">{user.email}</p>
                  {controllerName && (
                    <p className="text-white/50 text-xs mt-1">
                      Revenue Controller: <span className="text-white/80 font-medium">{controllerName}</span>
                    </p>
                  )}
                </div>
                {user.role && (
                  <span className="px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-medium capitalize">
                    {user.role}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Features Grid */}
          <div className="flex-1">
            <h2 className="text-white/80 text-sm font-medium mb-4 uppercase tracking-wider">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  gradient={feature.gradient}
                  onClick={feature.onClick}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 sm:mt-12 pt-6 border-t border-white/10">
            <div className="flex flex-col items-center gap-3">
              <img 
                src="/lovable-uploads/aman-logo-footer.png" 
                alt="Aman Taxi Sharjah" 
                className="h-8 sm:h-10 object-contain opacity-70"
              />
              <p className="text-xs text-white/40">© {new Date().getFullYear()} All Rights Reserved</p>
            </div>
          </footer>
        </div>
      </div>

      {/* Dialogs */}
      <AdminMessages
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
      />
      <DriverIncomeAuthDialog
        isOpen={isDriverIncomeDialogOpen}
        onClose={() => setIsDriverIncomeDialogOpen(false)}
      />
      <DriverSmsDialog
        isOpen={isSmsDialogOpen}
        onClose={() => setIsSmsDialogOpen(false)}
      />
      <DriverPortalSettingsDialog
        open={isPortalSettingsOpen}
        onOpenChange={setIsPortalSettingsOpen}
      />

      {/* PWA Prompts */}
      <InstallBanner />
      <NotificationPrompt />
    </div>
  );
};

export default HomePage;
