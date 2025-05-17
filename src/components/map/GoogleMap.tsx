
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
  
  // Use a ref to track mounted state
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    // Set mounted to true
    isMountedRef.current = true;
    
    // Generate a unique callback name for this map instance
    const callbackName = `initGoogleMap_${Math.random().toString(36).substr(2, 9)}`;
    
    // Define the map initialization callback
    window[callbackName] = function() {
      if (!isMountedRef.current || !mapRef.current || !window.google?.maps) return;
      
      try {
        // Create map instance
        const map = new window.google.maps.Map(mapRef.current, {
          center: center,
          zoom: zoom,
          mapTypeId: 'roadmap', // Use string literal instead of MapTypeId.ROADMAP
        });
        
        // Add markers
        markers.forEach(marker => {
          if (window.google?.maps) {
            new window.google.maps.Marker({
              position: { lat: marker.lat, lng: marker.lng },
              map: map,
              title: marker.name,
              label: {
                text: marker.id.toString(),
                color: "white"
              },
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: "#0EA5E9",
                fillOpacity: 1,
                strokeWeight: 0,
                scale: 10
              }
            });
          }
        });
        
        if (isMountedRef.current) {
          setMapLoaded(true);
          if (onLoad) onLoad();
        }
      } catch (error) {
        console.error("Error initializing Google Map:", error);
        if (isMountedRef.current) {
          if (onError) onError();
        }
      }
    };
    
    // Function to load the map
    const loadMap = () => {
      // If Google Maps is already loaded
      if (window.google && window.google.maps) {
        window[callbackName]();
        return;
      }
      
      // Create script element
      const script = document.createElement("script");
      script.id = `google-maps-api-${callbackName}`;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        if (isMountedRef.current && onError) {
          onError();
        }
      };
      
      // Append script to document
      document.head.appendChild(script);
    };
    
    // Start loading the map
    loadMap();
    
    // Clean up function
    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;
      
      // Clean up the global callback - don't attempt to remove script tags
      if (window[callbackName]) {
        window[callbackName] = undefined;
      }
    };
  }, [apiKey, center, zoom, markers, onError, onLoad]);
  
  return (
    <div 
      ref={mapRef} 
      className="w-full h-full"
      aria-label={mapLoaded ? "Google Map" : "Loading map..."}
    >
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
