
import React from "react";

interface MapLoadingIndicatorProps {
  isError: boolean;
}

export const MapLoadingIndicator: React.FC<MapLoadingIndicatorProps> = ({ isError }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center">
        <div className="h-8 w-8 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500">
          {isError ? "Error loading map" : "Loading map..."}
        </p>
      </div>
    </div>
  );
};
