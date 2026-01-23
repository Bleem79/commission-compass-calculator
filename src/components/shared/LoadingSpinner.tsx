import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  fullScreen?: boolean;
  message?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

/**
 * Reusable loading spinner component.
 */
export const LoadingSpinner = ({
  size = "md",
  className,
  fullScreen = false,
  message,
}: LoadingSpinnerProps) => {
  const spinner = (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

interface LoadingOverlayProps {
  message?: string;
}

/**
 * Full-page loading overlay for page transitions.
 */
export const LoadingOverlay = ({ message = "Loading..." }: LoadingOverlayProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
};
