
import React from "react";
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

const GoogleMap: React.FC<GoogleMapProps> = ({
  apiKey,
  center,
  zoom = 13,
  markers,
  onError,
  onLoad,
}) => {
  const { mapRef, mapLoaded, mapError } = useGoogleMaps({
    apiKey,
    center,
    zoom,
    markers,
    onError,
    onLoad,
  });
  
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
};

export default GoogleMap;
