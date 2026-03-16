import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  backPath?: string;
  backLabel?: string;
  showClose?: boolean;
  className?: string;
  headerActions?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "full";
  gradient?: string;
  variant?: "light" | "dark";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  full: "max-w-full",
};

/**
 * Shared page layout component with consistent navigation and styling.
 * Supports light (default) and dark variants.
 */
export const PageLayout = ({
  children,
  title,
  icon,
  backPath = "/home",
  backLabel = "Back to Home",
  showClose = true,
  className,
  headerActions,
  maxWidth = "6xl",
  gradient = "from-background via-blue-50/50 to-cyan-100/50",
  variant = "light",
}: PageLayoutProps) => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(backPath);
  };

  const isDark = variant === "dark";

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br p-4 sm:p-6 relative overflow-x-auto",
        gradient,
        className
      )}
    >
      {/* Animated background elements for dark variant */}
      {isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
      )}

      {/* Close button */}
      {showClose && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "fixed top-4 right-4 z-50 min-w-[44px] min-h-[44px]",
            isDark && "text-white/70 hover:text-white hover:bg-white/10"
          )}
          onClick={handleClose}
        >
          <X className={cn("h-6 w-6", isDark ? "text-white/70" : "text-muted-foreground hover:text-foreground")} />
        </Button>
      )}

      {/* Back button */}
      <Button
        variant="outline"
        className={cn(
          "fixed top-4 left-4 z-50 flex items-center gap-2 min-h-[44px]",
          isDark
            ? "bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            : "bg-background hover:bg-accent text-primary border-border"
        )}
        onClick={handleClose}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">{backLabel}</span>
      </Button>

      <div className={cn("mx-auto pt-16 relative z-10", maxWidthClasses[maxWidth])}>
        {/* Page header */}
        {(title || headerActions) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            {title && (
              <h1 className={cn(
                "text-lg sm:text-2xl font-bold flex items-center gap-2",
                isDark ? "text-white" : "text-foreground"
              )}>
                {icon}
                {title}
              </h1>
            )}
            {headerActions && (
              <div className="flex items-center gap-2 flex-wrap">{headerActions}</div>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
