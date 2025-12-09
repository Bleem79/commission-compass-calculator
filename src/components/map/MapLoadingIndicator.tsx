import React from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface MapLoadingIndicatorProps {
  isError?: boolean;
}

export const MapLoadingIndicator: React.FC<MapLoadingIndicatorProps> = ({ 
  isError = false 
}) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-10">
      <div className="flex flex-col items-center gap-3 p-6 bg-background/90 rounded-lg shadow-lg">
        {isError ? (
          <>
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">Failed to load map</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading map...</p>
          </>
        )}
      </div>
    </div>
  );
};
