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
  
  // Detect Google Maps authentication errors
  const checkForAuthError = useCallback(() => {
    if (!mapRef.current) return false;
    
    // Check for error messages in the map container
    const errorElement = mapRef.current.querySelector('.gm-err-container, .gm-err-message');
    if (errorElement) {
      return true;
    }
    
    // Check for the "Sorry! Something went wrong" text
    const textContent = mapRef.current.textContent || '';
    if (textContent.includes('Sorry!') || textContent.includes('Something went wrong')) {
      return true;
    }
    
    return false;
  }, []);
  
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
      
      // Check for auth errors periodically after map creation
      let errorCheckCount = 0;
      const errorCheckInterval = setInterval(() => {
        errorCheckCount++;
        
        if (checkForAuthError()) {
          clearInterval(errorCheckInterval);
          console.error("Google Maps authentication error detected");
          setMapError(true);
          setIsMapInitialized(false);
          onMapErrorRef.current?.();
          return;
        }
        
        // Stop checking after 5 seconds
        if (errorCheckCount > 25) {
          clearInterval(errorCheckInterval);
        }
      }, 200);
      
      // Listen for tiles loaded event
      window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'tilesloaded', () => {
        clearInterval(errorCheckInterval);
        
        // Double check for auth errors even after tiles loaded
        if (checkForAuthError()) {
          setMapError(true);
          onMapErrorRef.current?.();
          return;
        }
        
        setIsMapInitialized(true);
        setMapLoaded(true);
        setMapError(false);
        onMapCreateRef.current?.();
      });
      
      // Set a timeout as fallback
      setTimeout(() => {
        if (checkForAuthError()) {
          clearInterval(errorCheckInterval);
          setMapError(true);
          onMapErrorRef.current?.();
          return;
        }
        
        if (!mapLoaded && mapInstanceRef.current && !mapError) {
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
  }, [center, zoom, isMapInitialized, mapLoaded, mapError, checkForAuthError]);
  
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
