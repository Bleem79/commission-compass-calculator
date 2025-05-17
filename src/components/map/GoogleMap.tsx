
import React, { useEffect, useRef, useState } from "react";

interface GoogleMapProps {
  apiKey: string;
  center: { lat: number; lng: number };
  zoom?: number;
  markers: Array<{
    id: number;
    name: string;
    lat: number;
    lng: number;
  }>;
  onError?: () => void;
  onLoad?: () => void;
}

const GoogleMap: React.FC<GoogleMapProps> = ({
  apiKey,
  center,
  zoom = 13,
  markers,
  onError,
  onLoad,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const mapInstance = useRef<any>(null);
  const isMounted = useRef(true);
  const scriptLoaded = useRef(false);
  
  // Generate a unique callback name with timestamp for this component instance
  const callbackName = useRef(`initMap_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`);
  
  useEffect(() => {
    // Set up mounted ref for cleanup tracking
    isMounted.current = true;
    
    // Function to initialize the map
    const initializeMap = () => {
      if (!isMounted.current || !mapRef.current) {
        return;
      }

      // Check if Google Maps is available
      if (!window.google?.maps) {
        console.error("Google Maps API not available");
        if (isMounted.current) {
          setMapError(true);
          if (onError) onError();
        }
        return;
      }

      try {
        console.log("Initializing Google Map with center:", center);
        
        // Create the map instance
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        });
        
        mapInstance.current = map;
        
        // Add markers to the map
        markers.forEach((marker) => {
          if (window.google?.maps) {
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
          }
        });
        
        if (isMounted.current) {
          setMapLoaded(true);
          setMapError(false);
          if (onLoad) onLoad();
          console.log("Google Map loaded successfully");
        }
      } catch (error) {
        console.error("Error initializing Google Map:", error);
        if (isMounted.current) {
          setMapError(true);
          if (onError) onError();
        }
      }
    };

    // Define the callback function that Google Maps will call
    window[callbackName.current] = () => {
      scriptLoaded.current = true;
      console.log("Google Maps script loaded, initializing map");
      if (isMounted.current) {
        initializeMap();
      }
    };
    
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      console.log("Google Maps already loaded, initializing map directly");
      scriptLoaded.current = true;
      initializeMap();
      return;
    }
    
    // Helper to load the Google Maps script
    const loadGoogleMapsScript = () => {
      // Remove existing script if there's a callback mismatch to avoid conflicts
      const existingScript = document.getElementById("google-maps-api-script") as HTMLScriptElement | null;
      
      if (existingScript) {
        console.log("Google Maps script already exists, adding listener");
        
        if (!scriptLoaded.current) {
          existingScript.addEventListener("load", () => {
            if (isMounted.current) {
              scriptLoaded.current = true;
              console.log("Existing script loaded, initializing map");
              initializeMap();
            }
          });
        }
        
        // Check if the script might have already loaded
        if (window.google && window.google.maps) {
          scriptLoaded.current = true;
          console.log("Google Maps already available, initializing map");
          initializeMap();
        }
        
        return;
      }
      
      // Create and add the script with our callback
      const script = document.createElement("script");
      script.id = "google-maps-api-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName.current}&loading=async&v=weekly`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        console.error("Failed to load Google Maps script");
        if (isMounted.current) {
          setMapError(true);
          if (onError) onError();
        }
      };
      
      console.log("Adding Google Maps script to document");
      document.head.appendChild(script);
    };
    
    loadGoogleMapsScript();
    
    // Cleanup function - CRITICAL for preventing the "removeChild" error
    return () => {
      console.log("GoogleMap component unmounting, cleaning up");
      isMounted.current = false;
      
      // Clean up the callback only if it exists
      if (window[callbackName.current]) {
        try {
          delete window[callbackName.current];
        } catch (e) {
          console.warn("Failed to clean up map callback:", e);
          window[callbackName.current] = undefined;
        }
      }

      // Don't remove the script since other components might be using it
    };
  }, [apiKey, center.lat, center.lng, zoom, markers, onError, onLoad]);
  
  return (
    <div 
      ref={mapRef} 
      className="w-full h-full relative"
      aria-label={mapLoaded ? "Google Map" : "Loading map..."}
    >
      {(!mapLoaded || mapError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">
              {mapError ? "Error loading map" : "Loading map..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
