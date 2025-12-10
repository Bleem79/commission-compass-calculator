import React, { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/calculator/UserProfile";
import LeafletMap from "@/components/map/LeafletMap";
import LocationCard from "@/components/map/LocationCard";

// CNG location data
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

const CNGLocationPage = () => {
  const { user } = useAuth();
  
  // Calculate center point
  const centerLat = cngLocations.reduce((sum, loc) => sum + loc.lat, 0) / cngLocations.length;
  const centerLng = cngLocations.reduce((sum, loc) => sum + loc.lng, 0) / cngLocations.length;
  const mapCenter = { lat: centerLat, lng: centerLng };

  // Open location in Google Maps
  const openLocation = useCallback((url: string) => {
    window.open(url, "_blank");
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-muted/50 p-4 md:p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="w-full mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-3 md:mb-4">
            CNG Locations
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
            Find nearby CNG stations for refueling. Click on a marker or card to view directions.
          </p>
          
          {user && (
            <UserProfile 
              email={user.email} 
              username={user.username} 
              role={user.role}
            />
          )}
        </div>

        {/* Leaflet Map - no API key required */}
        <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden border-2 border-border mb-6 md:mb-8 relative">
          <LeafletMap
            center={mapCenter}
            zoom={13}
            markers={cngLocations}
            onMarkerClick={openLocation}
          />
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