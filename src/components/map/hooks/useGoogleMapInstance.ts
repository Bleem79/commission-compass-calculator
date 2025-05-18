
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
  const mapInstance = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapInitialized = useRef<boolean>(false);
  
  // Initialize the map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || mapInitialized.current) {
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
        mapInstance.current = new window.google.maps.Map(mapRef.current, mapOptions);
        
        // Set flag after map is created
        mapInitialized.current = true;
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
    } catch (error) {
      console.error("Error initializing Google Map:", error);
      setMapError(true);
      if (onMapError) onMapError();
    }
  }, [center, zoom, onMapCreate, onMapError]);
  
  // Update map center and zoom when props change
  useEffect(() => {
    if (mapInitialized.current && mapInstance.current) {
      try {
        mapInstance.current.setCenter(center);
        mapInstance.current.setZoom(zoom);
      } catch (error) {
        console.error("Error updating map center/zoom:", error);
      }
    }
  }, [center, zoom]);
  
  // Completely prevent unmount cleanup issues
  useEffect(() => {
    return () => {
      // Important! Nullify map instance first before React removes container
      if (mapInstance.current) {
        try {
          // Set map to null - this is important to remove event listeners
          mapInstance.current = null;
          mapInitialized.current = false;
        } catch (error) {
          console.error("Error during map cleanup:", error);
        }
      }
    };
  }, []);
  
  return { 
    mapRef, 
    mapInstance: mapInstance.current, 
    mapLoaded, 
    mapError, 
    initializeMap, 
    isMapInitialized: mapInitialized.current 
  };
};
