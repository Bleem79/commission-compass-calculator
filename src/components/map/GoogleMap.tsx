
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
  
  const { mapRef, mapLoaded, mapError } = useGoogleMaps({
    apiKey,
    center,
    zoom,
    markers,
    onError: () => {
      if (mountedRef.current && onError && !didCallErrorRef.current) {
        didCallErrorRef.current = true;
        onError();
      }
    },
    onLoad: () => {
      if (mountedRef.current && onLoad && !didCallLoadRef.current) {
        didCallLoadRef.current = true;
        onLoad();
      }
    },
  });
  
  useEffect(() => {
    // Component mount
    mountedRef.current = true;
    didCallErrorRef.current = false;
    didCallLoadRef.current = false;
    
    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      
      // Add a slight delay to let React finish DOM operations before we cleanup
      // This helps prevent the "removeChild" Node error
      if (mapRef.current) {
        const container = mapRef.current;
        setTimeout(() => {
          try {
            // Remove all child elements from the map container
            while (container && container.firstChild) {
              container.removeChild(container.firstChild);
            }
          } catch (e) {
            console.warn("Map cleanup warning:", e);
          }
        }, 0);
      }
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
