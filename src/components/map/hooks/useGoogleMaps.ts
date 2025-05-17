
import { useEffect, useRef, useState, useCallback } from "react";
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
  const markersRef = useRef<any[]>([]);
  
  // Generate a unique callback name for this map instance that persists across renders
  const callbackName = useRef(`initMap_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`);
  
  // Initialize the map
  const initializeMap = useCallback(() => {
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
      
      // Clean up any previous markers
      markersRef.current.forEach(marker => {
        if (marker) {
          marker.setMap(null);
        }
      });
      markersRef.current = [];
      
      // Add markers
      markers.forEach((markerData) => {
        const marker = new window.google.maps.Marker({
          position: { lat: markerData.lat, lng: markerData.lng },
          map,
          title: markerData.name,
          label: {
            text: markerData.id.toString(),
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
        markersRef.current.push(marker);
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
  }, [center, markers, onError, onLoad, zoom]);
  
  // Set up the Google Maps callback and script loading
  useEffect(() => {
    // Set up mounted ref for cleanup
    isMounted.current = true;
    
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
      console.log("GoogleMap hook cleanup running");
      isMounted.current = false;
      
      // Clean up the map instance and markers
      if (mapInstance.current) {
        markersRef.current.forEach(marker => {
          if (marker) {
            marker.setMap(null);
          }
        });
        markersRef.current = [];
        mapInstance.current = null;
      }
      
      // Clean up the callback function but don't remove script
      cleanupGoogleMapsScript(callbackName.current);
    };
  }, [apiKey, initializeMap, onError]);
  
  return { mapRef, mapLoaded, mapError };
};
