
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
            // Adding these options might help prevent DOM manipulation issues
            disableDefaultUI: false,
            zoomControl: true,
          };
          
          mapInstance.current = new window.google.maps.Map(mapRef.current, mapOptions);
        } catch (err) {
          console.error("Failed to create map instance:", err);
          setMapError(true);
          if (onMapError) onMapError();
          return;
        }
      }
      
      // Update map properties if instance exists
      if (mapInstance.current) {
        try {
          mapInstance.current.setCenter(center);
          mapInstance.current.setZoom(zoom);
          
          mapInitialized.current = true;
          setMapLoaded(true);
          setMapError(false);
          
          if (onMapCreate && !mapLoaded) {
            onMapCreate();
          }
        } catch (err) {
          console.error("Error updating map properties:", err);
        }
      }
      
    } catch (error) {
      console.error("Error initializing Google Map:", error);
      setMapError(true);
      if (onMapError) onMapError();
    }
  }, [center, zoom, onMapCreate, onMapError, mapLoaded]);
  
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
      mapInitialized.current = false;
      // We don't need to explicitly clean up the map instance
      // Just null our reference to it
      mapInstance.current = null;
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
