
import { useCallback, useRef, useEffect, useState } from "react";
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
  const [shouldUpdateMarkers, setShouldUpdateMarkers] = useState(false);

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
  
  // Set up markers effect to trigger when map is initialized
  useEffect(() => {
    if (isMapInitialized && mapInstance) {
      setShouldUpdateMarkers(true);
    }
  }, [isMapInitialized, mapInstance]);

  // Initialize markers management - only if map is initialized
  useGoogleMapMarkers({
    map: mapInstance,
    markers,
    isMapInitialized: shouldUpdateMarkers
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
