import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  CalendarDays, 
  Target, 
  Ban, 
  MessageSquare,
  ArrowLeft,
  X,
  ChevronRight,
  FileWarning
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PortalCardProps {
  icon: React.ReactNode;
  title: string;
  gradient: string;
  onClick: () => void;
}

const PortalCard = ({ icon, title, gradient, onClick }: PortalCardProps) => (
  <button
    onClick={onClick}
    className={cn(
      "group relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white transition-all duration-300",
      "hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]",
      "flex flex-col items-center justify-center gap-4",
      "min-h-[160px] sm:min-h-[180px]",
      "backdrop-blur-sm border border-white/20",
      gradient
    )}
  >
    {/* Shimmer effect */}
    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    
    {/* Icon container */}
    <div className="relative z-10 p-4 rounded-2xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
      {icon}
    </div>
    
    {/* Title */}
    <h3 className="relative z-10 text-sm sm:text-base font-semibold text-center leading-tight">
      {title}
    </h3>
    
    {/* Arrow indicator */}
    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-300 w-5 h-5" />
  </button>
);

const DriverPortalPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleClose = () => {
    navigate("/home");
  };

  const portalItems = [
    {
      icon: <CalendarDays className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Driver Income",
      gradient: "bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600",
      onClick: () => navigate("/driver-income"),
    },
    {
      icon: <Target className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Target Trips",
      gradient: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600",
      onClick: () => navigate("/driver-target-trips"),
    },
    {
      icon: <Ban className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Absent Fine",
      gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500",
      onClick: () => navigate("/driver-absent-fine-view"),
    },
    {
      icon: <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Request",
      gradient: "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500",
      onClick: () => navigate("/driver-request"),
    },
    {
      icon: <FileWarning className="w-8 h-8 sm:w-10 sm:h-10" />,
      title: "Warning Letter",
      gradient: "bg-gradient-to-br from-red-600 via-rose-600 to-pink-600",
      onClick: () => navigate("/driver-warning-letter"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          
          {/* Header */}
          <header className="flex items-center justify-between gap-4 mb-8">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              onClick={handleClose}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Home</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={handleClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </header>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Driver Main Portal</h1>
            {user && (
              <p className="text-white/60 text-sm">
                Welcome, {user.username || user.email}
              </p>
            )}
          </div>

          {/* Portal Cards Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {portalItems.map((item, index) => (
                <PortalCard
                  key={index}
                  icon={item.icon}
                  title={item.title}
                  gradient={item.gradient}
                  onClick={item.onClick}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-6 border-t border-white/10">
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
    </div>
  );
};

export default DriverPortalPage;
