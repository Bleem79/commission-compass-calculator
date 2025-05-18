
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
    if (!mapRef.current) {
      return;
    }

    try {
      // Check if Google Maps API is loaded properly
      if (!window.google || !window.google.maps) {
        console.error("Google Maps API not loaded properly");
        setMapError(true);
        if (onMapError) onMapError();
        return;
      }

      console.log("Initializing Google Map with center:", center);
      
      // Create the map if it doesn't exist
      if (!mapInstance.current && mapRef.current) {
        try {
          mapInstance.current = new window.google.maps.Map(mapRef.current, {
            center,
            zoom,
            mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          });
        } catch (err) {
          console.error("Failed to create map instance:", err);
          setMapError(true);
          if (onMapError) onMapError();
          return;
        }
      }
      
      // Update map properties if instance exists
      if (mapInstance.current) {
        mapInstance.current.setCenter(center);
        mapInstance.current.setZoom(zoom);
        
        mapInitialized.current = true;
        setMapLoaded(true);
        setMapError(false);
        
        if (onMapCreate) onMapCreate();
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
  
  // Cleanup function for unmounting
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        // Perform any necessary cleanup for the map instance
        // Note: Google Maps doesn't have a specific destroy method,
        // but we can null out our reference
        mapInstance.current = null;
      }
      mapInitialized.current = false;
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
