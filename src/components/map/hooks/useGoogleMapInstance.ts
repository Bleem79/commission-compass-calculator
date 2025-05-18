
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
      if (!window.google || !window.google.maps || typeof window.google.maps.Map !== 'function') {
        console.error("Google Maps API not loaded properly");
        setMapError(true);
        if (onMapError) onMapError();
        return;
      }

      // Only create a new map instance if one doesn't exist and the ref is valid
      if (!mapInstance.current && mapRef.current) {
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
          return;
        }
      }
      // Update map properties if instance exists
      else if (mapInstance.current) {
        try {
          mapInstance.current.setCenter(center);
          mapInstance.current.setZoom(zoom);
        } catch (err) {
          console.error("Error updating map properties:", err);
        }
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
      // Explicitly clear the map instance before React unmounts the container
      if (mapInstance.current && mapRef.current) {
        try {
          // Set map to null - this is important to remove event listeners
          mapInstance.current = null;
        } catch (error) {
          console.error("Error during map cleanup:", error);
        }
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
