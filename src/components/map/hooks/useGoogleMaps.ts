import { useCallback, useRef, useEffect } from "react";
import { useGoogleMapsScript } from "./useGoogleMapsScript";
import { useGoogleMapInstance } from "./useGoogleMapInstance";
import { useGoogleMapMarkers } from "./useGoogleMapMarkers";

interface UseGoogleMapsProps {
  apiKey: string;
  center: { lat: number; lng: number };
  zoom: number;
  markers: Array<{
    id: number;
    name: string;
    lat: number;
    lng: number;
  }>;
  onError?: () => void;
  onLoad?: () => void;
}

export const useGoogleMaps = ({
  apiKey,
  center,
  zoom,
  markers,
  onError,
  onLoad,
}: UseGoogleMapsProps) => {
  const isMounted = useRef(true);
  const didCallErrorRef = useRef(false);
  const didCallLoadRef = useRef(false);

  // Handle map creation success
  const handleMapCreated = useCallback(() => {
    if (isMounted.current && onLoad && !didCallLoadRef.current) {
      didCallLoadRef.current = true;
      onLoad();
    }
  }, [onLoad]);

  // Handle map or script error
  const handleMapError = useCallback(() => {
    if (isMounted.current && onError && !didCallErrorRef.current) {
      didCallErrorRef.current = true;
      onError();
    }
  }, [onError]);

  // Initialize map instance management
  const { 
    mapRef, 
    mapInstance, 
    mapLoaded, 
    mapError, 
    initializeMap,
    isMapInitialized 
  } = useGoogleMapInstance({
    center,
    zoom,
    onMapCreate: handleMapCreated,
    onMapError: handleMapError
  });

  // Initialize Google Maps script loading
  const { isScriptLoaded } = useGoogleMapsScript({
    apiKey,
    onScriptLoad: initializeMap,
    onError: handleMapError
  });
  
  // Handle markers at top level (proper hook usage)
  useGoogleMapMarkers({
    map: mapInstance,
    markers,
    isMapInitialized
  });
  
  // Set up mounted ref for cleanup
  useEffect(() => {
    isMounted.current = true;
    didCallErrorRef.current = false;
    didCallLoadRef.current = false;
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  return { 
    mapRef, 
    mapLoaded: mapLoaded && isScriptLoaded, 
    mapError 
  };
};
