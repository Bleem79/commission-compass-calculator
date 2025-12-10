import React, { useState, useEffect, useCallback, useRef } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/calculator/UserProfile";
import GoogleMap from "@/components/map/GoogleMap";
import StaticMap from "@/components/map/StaticMap";
import LocationCard from "@/components/map/LocationCard";
import { toast } from "sonner";

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

// Updated API key for Google Maps
const API_KEY = "AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg"; // Using a Google Maps demo key

const CNGLocationPage = () => {
  const { user } = useAuth();
  const [mapUrl, setMapUrl] = useState<string>("");
  const [mapError, setMapError] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [mapKey, setMapKey] = useState<number>(Date.now());
  const mountedRef = useRef(true);
  
  // Calculate center point for static map fallback
  const centerLat = cngLocations.reduce((sum, loc) => sum + loc.lat, 0) / cngLocations.length;
  const centerLng = cngLocations.reduce((sum, loc) => sum + loc.lng, 0) / cngLocations.length;
  const mapCenter = { lat: centerLat, lng: centerLng };

  // Set up static map URL for fallback
  useEffect(() => {
    mountedRef.current = true;
    
    const markers = cngLocations.map(loc => 
      `&markers=color:blue%7Clabel:${loc.id}%7C${loc.lat},${loc.lng}`
    ).join('');
    
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=13&size=600x400&maptype=roadmap${markers}&key=${API_KEY}`;
    setMapUrl(staticMapUrl);
    
    return () => {
      mountedRef.current = false;
    };
  }, [centerLat, centerLng]);

  // Open location in Google Maps
  const openLocation = useCallback((url: string) => {
    window.open(url, "_blank");
  }, []);
  
  const handleMapError = useCallback(() => {
    if (!mountedRef.current) return;
    
    setMapError(true);
    toast.error("Map Loading Error", {
      description: "Unable to load the interactive map. Using static map fallback."
    });
    console.error("Failed to load Google Maps. Using static map fallback.");
  }, []);
  
  const handleMapLoad = useCallback(() => {
    if (!mountedRef.current) return;
    
    setMapLoaded(true);
    toast.success("Map Loaded", {
      description: "Google Maps loaded successfully."
    });
    console.log("Google Maps loaded successfully");
  }, []);
  
  // Retry loading the map on error
  const retryMapLoad = useCallback(() => {
    setMapKey(Date.now());
    setMapError(false);
    setMapLoaded(false);
    
    toast.info("Retrying Map Load", {
      description: "Attempting to load the map again..."
    });
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-muted/50 p-4 md:p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="w-full mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-3 md:mb-4">
            CNG Locations
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
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

        {/* Map section with error handling - responsive height */}
        <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden border-2 border-border mb-6 md:mb-8 relative bg-muted">
          {mapError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Map Unavailable</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Unable to load interactive map. Use the cards below to navigate to each location.
                </p>
              </div>
              
              <button 
                onClick={retryMapLoad}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
              >
                Retry Loading Map
              </button>
            </div>
          ) : (
            <GoogleMap
              key={mapKey}
              apiKey={API_KEY}
              center={mapCenter}
              zoom={13}
              markers={cngLocations}
              onError={handleMapError}
              onLoad={handleMapLoad}
            />
          )}
        </div>

        <h2 className="text-xl md:text-2xl font-semibold text-primary mb-4">CNG Station Directory</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
          {cngLocations.map((location) => (
            <LocationCard
              key={location.id}
              id={location.id}
              name={location.name}
              url={location.url}
              onOpenLocation={openLocation}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CNGLocationPage;
