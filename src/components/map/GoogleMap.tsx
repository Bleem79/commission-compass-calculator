
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
  const didCallErrorRef = useRef(false);
  const didCallLoadRef = useRef(false);
  
  const handleError = React.useCallback(() => {
    if (mountedRef.current && onError && !didCallErrorRef.current) {
      didCallErrorRef.current = true;
      onError();
    }
  }, [onError]);
  
  const handleLoad = React.useCallback(() => {
    if (mountedRef.current && onLoad && !didCallLoadRef.current) {
      didCallLoadRef.current = true;
      onLoad();
    }
  }, [onLoad]);
  
  const { mapRef, mapLoaded, mapError } = useGoogleMaps({
    apiKey,
    center,
    zoom,
    markers,
    onError: handleError,
    onLoad: handleLoad,
  });
  
  // Store the map container reference for safer cleanup
  useEffect(() => {
    // Component mount
    mountedRef.current = true;
    didCallErrorRef.current = false;
    didCallLoadRef.current = false;
    
    // Safer cleanup on unmount 
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  return (
    <div 
      className="w-full h-full relative"
      aria-label={mapLoaded ? "Google Map" : "Loading map..."}
    >
      <div
        ref={mapRef} 
        className="w-full h-full"
      />
      {(!mapLoaded || mapError) && (
        <MapLoadingIndicator key="map-loading-indicator" isError={mapError} />
      )}
    </div>
  );
});

GoogleMap.displayName = "GoogleMap";

export default GoogleMap;
