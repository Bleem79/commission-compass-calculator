
import React, { useState, useEffect, useRef } from "react";
import { Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/calculator/UserProfile";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AspectRatio } from "@/components/ui/aspect-ratio";

// CNG location data with properly formatted Google Maps embed URLs
const cngLocations = [
  {
    id: 1,
    name: "Al Mirqab",
    url: "https://maps.app.goo.gl/29Cn1UbFJ2v41hbD7",
    lat: 25.2930979,
    lng: 55.3859973,
  },
  {
    id: 2,
    name: "Maysaloon",
    url: "https://maps.app.goo.gl/3YE7fXz1bZTiWJBs6",
    lat: 25.2819871,
    lng: 55.4003829,
  },
  {
    id: 3,
    name: "Al Shahba",
    url: "https://maps.app.goo.gl/nT8JLk91Tjm8L72u5",
    lat: 25.3003995,
    lng: 55.3879364,
  },
  {
    id: 4,
    name: "Samnan",
    url: "https://maps.app.goo.gl/2XhRoq5Rmv22qpAy5",
    lat: 25.3240741,
    lng: 55.4052132,
  }
];

// API Key (this is a demo key)
const API_KEY = "AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8";

const CNGLocationPage = () => {
  const { user } = useAuth();
  const [mapUrl, setMapUrl] = useState<string>("");
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  
  // Calculate center point for static map fallback
  const centerLat = cngLocations.reduce((sum, loc) => sum + loc.lat, 0) / cngLocations.length;
  const centerLng = cngLocations.reduce((sum, loc) => sum + loc.lng, 0) / cngLocations.length;

  // Set up the static map URL for fallback
  useEffect(() => {
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=13&size=600x400&maptype=roadmap&key=${API_KEY}`;
    setMapUrl(staticMapUrl);
  }, []);

  // Initialize Google Maps with a safer pattern
  useEffect(() => {
    // Generate a unique callback name for this component instance
    const callbackName = `initGoogleMapCNG_${Date.now()}`;
    
    // Signal to track if component is still mounted
    let isMounted = true;
    
    // Initialize map function
    const initMap = () => {
      if (!isMounted || !mapRef.current || !window.google || !window.google.maps) {
        return;
      }

      try {
        const mapOptions = {
          center: { lat: centerLat, lng: centerLng },
          zoom: 13,
        };
        
        const map = new window.google.maps.Map(mapRef.current, mapOptions);
        
        // Add markers for each location
        cngLocations.forEach(location => {
          new window.google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: map,
            title: location.name,
            label: {
              text: location.id.toString(),
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
        });
        
        if (isMounted) {
          setMapLoaded(true);
        }
      } catch (error) {
        console.error("Error initializing Google Map:", error);
        if (isMounted) {
          setMapError(true);
        }
      }
    };

    // Register the init callback
    window[callbackName] = function() {
      initMap();
    };
    
    const loadMap = () => {
      // If Google Maps is already loaded
      if (window.google && window.google.maps) {
        initMap();
        return;
      }
      
      // Create a script element for Google Maps API
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=${callbackName}&loading=async`;
      script.async = true;
      script.defer = true;
      script.id = `google-maps-script-${Date.now()}`; // Unique ID
      
      script.onerror = () => {
        if (isMounted) {
          console.error("Google Maps script failed to load");
          setMapError(true);
        }
      };
      
      document.head.appendChild(script);
    };
    
    // Load the map
    loadMap();
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      // Clean up the callback
      if (window[callbackName]) {
        window[callbackName] = undefined;
      }
      
      // We don't need to remove the script tag manually
      // This avoids the DOM error when React tries to remove it twice
      // The browser will clean up orphaned script tags
    };
  }, [centerLat, centerLng]);

  const openLocation = (url: string) => {
    window.open(url, "_blank");
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="w-full mb-8">
          <h1 className="text-3xl font-bold text-indigo-800 mb-4">
            CNG Locations
          </h1>
          <p className="text-slate-600 mb-6">
            Find nearby CNG stations for refueling. Click on a station to view its location on Google Maps.
          </p>
          
          {user && (
            <UserProfile 
              email={user.email} 
              username={user.username} 
              role={user.role}
            />
          )}
        </div>

        {/* Map section with error handling */}
        <div className="w-full h-[500px] rounded-lg overflow-hidden border-2 border-indigo-300 mb-8">
          {mapError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
              <Alert variant="destructive" className="max-w-md">
                <AlertTitle>Map Loading Error</AlertTitle>
                <AlertDescription>
                  Unable to load the interactive map. You can still view individual locations using the cards below.
                </AlertDescription>
              </Alert>
              <div className="mt-4">
                <AspectRatio ratio={16/9} className="max-w-full overflow-hidden">
                  <img 
                    src={mapUrl} 
                    alt="Static map of CNG locations" 
                    className="rounded-lg shadow-md w-full h-full object-cover" 
                  />
                </AspectRatio>
              </div>
            </div>
          ) : (
            <div 
              ref={mapRef} 
              style={{ width: '100%', height: '100%' }}
              className="relative"
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
          )}
        </div>

        <h2 className="text-2xl font-semibold text-indigo-700 mb-4">CNG Station Directory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {cngLocations.map((location) => (
            <Card 
              key={location.id}
              className="bg-white shadow-md hover:shadow-lg transition-all"
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-3">
                      {location.id}
                    </div>
                    <h3 className="text-lg font-medium">{location.name}</h3>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => openLocation(location.url)}
                    className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Navigation size={18} />
                    Open in Maps
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CNGLocationPage;
