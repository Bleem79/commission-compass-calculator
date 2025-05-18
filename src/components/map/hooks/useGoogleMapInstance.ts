
import { useRef, useState, useCallback, useEffect } from "react";

interface UseGoogleMapInstanceProps {
  center: { lat: number; lng: number };
  zoom: number;
  onMapCreate?: () => void;
  onMapError?: () => void;
}

export const useGoogleMapInstance = ({
  center,
  zoom,
  onMapCreate,
  onMapError,
}: UseGoogleMapInstanceProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  
  // Initialize the map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || isMapInitialized || !window.google || !window.google.maps) {
      return;
    }

    try {
      const mapOptions = {
        center,
        zoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
      };
      
      // Create new map instance
      const newMapInstance = new window.google.maps.Map(mapRef.current, mapOptions);
      
      // Store reference to map instance
      mapInstanceRef.current = newMapInstance;
      
      // Set flags
      setIsMapInitialized(true);
      setMapLoaded(true);
      setMapError(false);
      
      if (onMapCreate) {
        onMapCreate();
      }
    } catch (err) {
      console.error("Failed to create map instance:", err);
      setMapError(true);
      if (onMapError) onMapError();
    }
  }, [center, zoom, onMapCreate, onMapError, isMapInitialized]);
  
  // Update map center and zoom when props change
  useEffect(() => {
    if (isMapInitialized && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.setCenter(center);
        mapInstanceRef.current.setZoom(zoom);
      } catch (error) {
        console.error("Error updating map center/zoom:", error);
      }
    }
  }, [center, zoom, isMapInitialized]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Nullify map instance on unmount to prevent memory leaks
      mapInstanceRef.current = null;
      setIsMapInitialized(false);
    };
  }, []);
  
  return { 
    mapRef, 
    mapInstance: mapInstanceRef.current, 
    mapLoaded, 
    mapError, 
    initializeMap, 
    isMapInitialized 
  };
};
