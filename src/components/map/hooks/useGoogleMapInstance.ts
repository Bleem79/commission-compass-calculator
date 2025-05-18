
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
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  
  // Initialize the map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || isMapInitialized) {
      return;
    }

    try {
      // Check if Google Maps API is loaded properly
      if (!window.google || !window.google.maps || typeof window.google.maps.Map !== 'function') {
        console.error("Google Maps API not loaded properly");
        setMapError(true);
        if (onMapError) onMapError();
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
        
        // Set flag after map is created
        setIsMapInitialized(true);
        setMapLoaded(true);
        setMapError(false);
        setMapInstance(newMapInstance);
        
        if (onMapCreate) {
          onMapCreate();
        }
      } catch (err) {
        console.error("Failed to create map instance:", err);
        setMapError(true);
        if (onMapError) onMapError();
      }
    } catch (error) {
      console.error("Error initializing Google Map:", error);
      setMapError(true);
      if (onMapError) onMapError();
    }
  }, [center, zoom, onMapCreate, onMapError, isMapInitialized]);
  
  // Update map center and zoom when props change
  useEffect(() => {
    if (isMapInitialized && mapInstance) {
      try {
        mapInstance.setCenter(center);
        mapInstance.setZoom(zoom);
      } catch (error) {
        console.error("Error updating map center/zoom:", error);
      }
    }
  }, [center, zoom, mapInstance, isMapInitialized]);
  
  // Completely prevent unmount cleanup issues
  useEffect(() => {
    return () => {
      // Important! Nullify map instance on unmount
      setMapInstance(null);
      setIsMapInitialized(false);
    };
  }, []);
  
  return { 
    mapRef, 
    mapInstance, 
    mapLoaded, 
    mapError, 
    initializeMap, 
    isMapInitialized 
  };
};
