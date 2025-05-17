
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

    // Define the Google Maps callback function
    window[callbackName.current] = function() {
      if (isMounted.current) {
        initializeMap();
      }
    };
    
    // Helper function to load Google Maps script
    const loadGoogleMapsScript = () => {
      // Check if script is already loaded
      if (window.google && window.google.maps) {
        console.log("Google Maps already loaded, initializing directly");
        initializeMap();
        return;
      }
      
      // Check if we already tried to add the script
      if (scriptAdded.current) {
        return;
      }
      
      scriptAdded.current = true;
      
      // Create new script element
      const script = document.createElement("script");
      script.id = `google-maps-script-${callbackName.current}`;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName.current}`;
      script.async = true;
      script.defer = true;
      
      // Handle script loading error
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
    
    // Cleanup function
    return () => {
      console.log("GoogleMap component unmounting");
      isMounted.current = false;
      
      // Clean up the callback function
      if (window[callbackName.current]) {
        window[callbackName.current] = null;
      }
      
      // We intentionally don't remove the script element
      // This prevents the "removeChild" error
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
