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
  
  // Stable callback refs
  const onMapCreateRef = useRef(onMapCreate);
  const onMapErrorRef = useRef(onMapError);
  
  useEffect(() => {
    onMapCreateRef.current = onMapCreate;
    onMapErrorRef.current = onMapError;
  }, [onMapCreate, onMapError]);
  
  // Initialize the map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || isMapInitialized) {
      return;
    }
    
    if (!window.google?.maps?.Map) {
      console.error("Google Maps API not loaded");
      setMapError(true);
      onMapErrorRef.current?.();
      return;
    }

    try {
      const mapOptions = {
        center,
        zoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      };
      
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
      
      // Listen for tiles loaded event
      window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'tilesloaded', () => {
        setIsMapInitialized(true);
        setMapLoaded(true);
        setMapError(false);
        onMapCreateRef.current?.();
      });
      
      // Set a timeout as fallback
      setTimeout(() => {
        if (!mapLoaded && mapInstanceRef.current) {
          setIsMapInitialized(true);
          setMapLoaded(true);
          onMapCreateRef.current?.();
        }
      }, 3000);
      
    } catch (err) {
      console.error("Failed to create map instance:", err);
      setMapError(true);
      onMapErrorRef.current?.();
    }
  }, [center, zoom, isMapInitialized, mapLoaded]);
  
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
