
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/calculator/UserProfile";
import GoogleMap from "@/components/map/GoogleMap";
import StaticMap from "@/components/map/StaticMap";
import LocationCard from "@/components/map/LocationCard";

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
  const [mapError, setMapError] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  
  // Use a ref to track mount state
  const isMountedRef = useRef(true);
  
  // Calculate center point for static map fallback
  const centerLat = cngLocations.reduce((sum, loc) => sum + loc.lat, 0) / cngLocations.length;
  const centerLng = cngLocations.reduce((sum, loc) => sum + loc.lng, 0) / cngLocations.length;

  // Set up the static map URL for fallback
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const markers = cngLocations.map(loc => 
      `&markers=color:blue%7Clabel:${loc.id}%7C${loc.lat},${loc.lng}`
    ).join('');
    
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=13&size=600x400&maptype=roadmap${markers}&key=${API_KEY}`;
    setMapUrl(staticMapUrl);
    
    return () => {
      isMountedRef.current = false;
    };
  }, [centerLat, centerLng]);

  // Open location in Google Maps
  const openLocation = useCallback((url: string) => {
    window.open(url, "_blank");
  }, []);
  
  const handleMapError = useCallback(() => {
    if (isMountedRef.current) {
      setMapError(true);
    }
  }, []);
  
  const handleMapLoad = useCallback(() => {
    if (isMountedRef.current) {
      setMapLoaded(true);
    }
  }, []);
  
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
        <div className="w-full h-[500px] rounded-lg overflow-hidden border-2 border-indigo-300 mb-8 relative">
          {mapError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
              <Alert variant="destructive" className="max-w-md">
                <AlertTitle>Map Loading Error</AlertTitle>
                <AlertDescription>
                  Unable to load the interactive map. You can still view individual locations using the cards below.
                </AlertDescription>
              </Alert>
              <div className="mt-4">
                <StaticMap mapUrl={mapUrl} alt="Static map of CNG locations" />
              </div>
            </div>
          ) : (
            <GoogleMap
              apiKey={API_KEY}
              center={{ lat: centerLat, lng: centerLng }}
              zoom={13}
              markers={cngLocations.map(loc => ({
                id: loc.id,
                name: loc.name,
                lat: loc.lat,
                lng: loc.lng
              }))}
              onError={handleMapError}
              onLoad={handleMapLoad}
            />
          )}
        </div>

        <h2 className="text-2xl font-semibold text-indigo-700 mb-4">CNG Station Directory</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
