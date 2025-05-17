
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
  const googleMapScriptId = "google-maps-api-script";
  
  // Create a unique ID for this instance
  const instanceId = useRef(`map-instance-${Math.random().toString(36).substring(2, 9)}`);
  
  useEffect(() => {
    let isMounted = true;
    const callbackName = `initMap${instanceId.current}`;
    
    // Define the callback function
    window[callbackName] = function() {
      if (!isMounted || !mapRef.current || !window.google?.maps) return;
      
      try {
        // Create map instance
        const map = new window.google.maps.Map(mapRef.current, {
          center: center,
          zoom: zoom,
          mapTypeId: 'roadmap',
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
        
        if (isMounted) {
          setMapLoaded(true);
          if (onLoad) onLoad();
        }
      } catch (error) {
        console.error("Error initializing Google Map:", error);
        if (isMounted && onError) {
          onError();
        }
      }
    };
    
    const loadGoogleMapsScript = () => {
      // Check if script already exists
      if (document.getElementById(googleMapScriptId)) {
        // If Google Maps is already loaded and initialized
        if (window.google && window.google.maps) {
          window[callbackName]();
        } else {
          // Wait for the existing script to load
          const existingScript = document.getElementById(googleMapScriptId) as HTMLScriptElement;
          existingScript.addEventListener('load', () => {
            if (isMounted) {
              window[callbackName]();
            }
          });
        }
        return;
      }
      
      // Create a new script element if it doesn't exist
      const script = document.createElement("script");
      script.id = googleMapScriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        if (isMounted && onError) {
          onError();
        }
      };
      
      // Append the script to the document head
      document.head.appendChild(script);
    };
    
    loadGoogleMapsScript();
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      // Clean up the callback
      if (window[callbackName]) {
        window[callbackName] = undefined;
      }
      
      // Do NOT remove the script element - this is what causes the error
      // Let the browser handle the script lifecycle
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
