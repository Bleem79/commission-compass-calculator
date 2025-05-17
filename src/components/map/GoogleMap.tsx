
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
  const isMounted = useRef(true);
  const mapInstance = useRef<any>(null);
  
  // Generate a truly unique callback name for this component instance
  const callbackName = useRef(`initMap_${Math.random().toString(36).substring(2, 11)}`);
  
  useEffect(() => {
    // Set up mounted ref
    isMounted.current = true;
    
    // Function to initialize the map
    const initializeMap = () => {
      if (!isMounted.current || !mapRef.current || !window.google?.maps) {
        return;
      }

      try {
        // Create the map instance
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeId: "roadmap",
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
      initializeMap();
    };
    
    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      // Maps API already loaded, initialize map directly
      initializeMap();
      return;
    }
    
    // Helper to load the Google Maps script
    const loadGoogleMapsScript = () => {
      const existingScript = document.getElementById("google-maps-api-script") as HTMLScriptElement | null;
      
      if (existingScript) {
        // Script already exists, add a load listener
        existingScript.addEventListener("load", () => {
          if (isMounted.current) {
            initializeMap();
          }
        });
        
        // Also check if the script might have already loaded
        if (window.google && window.google.maps) {
          initializeMap();
        }
        
        return;
      }
      
      // Create and add the script
      const script = document.createElement("script");
      script.id = "google-maps-api-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName.current}&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        if (isMounted.current) {
          setMapError(true);
          if (onError) onError();
        }
      };
      
      document.head.appendChild(script);
    };
    
    loadGoogleMapsScript();
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      
      // Clean up the callback
      if (window[callbackName.current]) {
        window[callbackName.current] = undefined;
      }
      
      // Don't remove the script - let the browser handle it
    };
  }, [apiKey, center, zoom, markers, onError, onLoad]);
  
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
