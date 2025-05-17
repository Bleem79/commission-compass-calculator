
import React, { memo, useEffect, useRef } from "react";
import { useGoogleMaps } from "./hooks/useGoogleMaps";
import { MapLoadingIndicator } from "./MapLoadingIndicator";

interface GoogleMapProps {
  apiKey: string;
  center: { lat: number; lng: number };
  zoom?: number;
  markers: Array<{
    id: number;
    name: string;
    lat: number;
    lng: number;
  }>;
  onError?: () => void;
  onLoad?: () => void;
}

// Using memo to prevent unnecessary re-renders
const GoogleMap: React.FC<GoogleMapProps> = memo(({
  apiKey,
  center,
  zoom = 13,
  markers,
  onError,
  onLoad,
}) => {
  const mountedRef = useRef(true);
  
  const { mapRef, mapLoaded, mapError } = useGoogleMaps({
    apiKey,
    center,
    zoom,
    markers,
    onError: () => {
      if (mountedRef.current && onError) {
        onError();
      }
    },
    onLoad: () => {
      if (mountedRef.current && onLoad) {
        onLoad();
      }
    },
  });
  
  useEffect(() => {
    // Component mount
    mountedRef.current = true;
    
    // Cleanup on unmount
    return () => {
      console.log("GoogleMap component unmounting");
      mountedRef.current = false;
    };
  }, []);
  
  return (
    <div 
      ref={mapRef} 
      className="w-full h-full relative"
      aria-label={mapLoaded ? "Google Map" : "Loading map..."}
    >
      {(!mapLoaded || mapError) && (
        <MapLoadingIndicator isError={mapError} />
      )}
    </div>
  );
});

GoogleMap.displayName = "GoogleMap";

export default GoogleMap;
