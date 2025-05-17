
import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsScript, cleanupGoogleMapsScript } from "../utils/mapUtils";

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
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapInstance = useRef<any>(null);
  const isMounted = useRef(true);
  const scriptAdded = useRef(false);
  
  // Generate a unique callback name for this map instance
  const callbackName = useRef(`initMap_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`);
  
  useEffect(() => {
    // Set up mounted ref for cleanup
    isMounted.current = true;
    
    // Function to initialize the map
    const initializeMap = () => {
      if (!isMounted.current || !mapRef.current) {
        return;
      }

      try {
        // Check if Google Maps API is loaded properly
        if (!window.google || !window.google.maps) {
          console.error("Google Maps API not loaded properly");
          if (isMounted.current) {
            setMapError(true);
            if (onError) onError();
          }
          return;
        }

        console.log("Initializing Google Map with center:", center);
        
        // Create the map
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        });
        
        mapInstance.current = map;
        
        // Add markers
        markers.forEach((marker) => {
          new window.google.maps.Marker({
            position: { lat: marker.lat, lng: marker.lng },
            map,
            title: marker.name,
            label: {
              text: marker.id.toString(),
              color: "white",
            },
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: "#0EA5E9",
              fillOpacity: 1,
              strokeWeight: 0,
              scale: 10,
            },
          });
        });
        
        if (isMounted.current) {
          setMapLoaded(true);
          setMapError(false);
          if (onLoad) onLoad();
          console.log("Google Maps loaded successfully");
        }
      } catch (error) {
        console.error("Error initializing Google Map:", error);
        if (isMounted.current) {
          setMapError(true);
          if (onError) onError();
        }
      }
    };

    // Define the Google Maps callback function
    window[callbackName.current] = function() {
      if (isMounted.current) {
        initializeMap();
      }
    };
    
    // Load the Google Maps script
    loadGoogleMapsScript({
      apiKey,
      callbackName: callbackName.current,
      onInitialize: initializeMap,
      onError: () => {
        if (isMounted.current) {
          setMapError(true);
          if (onError) onError();
        }
      },
      isMounted,
      scriptAdded
    });
    
    // Cleanup function
    return () => {
      console.log("GoogleMap component unmounting");
      isMounted.current = false;
      
      // Clean up the callback function and script tag
      cleanupGoogleMapsScript(callbackName.current);
    };
  }, [apiKey, center.lat, center.lng, zoom, markers, onError, onLoad]);
  
  return { mapRef, mapLoaded, mapError };
};
