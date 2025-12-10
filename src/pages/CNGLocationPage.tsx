import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/calculator/UserProfile";
import LeafletMap from "@/components/map/LeafletMap";
import LocationCard from "@/components/map/LocationCard";
import { MapPin, Loader2 } from "lucide-react";

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

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const CNGLocationPage = () => {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Get user's current location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoadingLocation(false);
      },
      (error) => {
        console.log("Geolocation error:", error.message);
        setLocationError("Unable to get your location");
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Calculate distances for each location
  const locationsWithDistance = cngLocations.map((location) => ({
    ...location,
    distance: userLocation
      ? calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng)
      : null,
  })).sort((a, b) => {
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  // Calculate center point - use user location if available, otherwise center of stations
  const mapCenter = userLocation || {
    lat: cngLocations.reduce((sum, loc) => sum + loc.lat, 0) / cngLocations.length,
    lng: cngLocations.reduce((sum, loc) => sum + loc.lng, 0) / cngLocations.length,
  };

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

          {/* Location status */}
          <div className="flex items-center gap-2 text-sm mb-4">
            {isLoadingLocation ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Getting your location...
              </span>
            ) : userLocation ? (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <MapPin className="h-4 w-4" />
                Location detected - showing distances
              </span>
            ) : locationError ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {locationError}
              </span>
            ) : null}
          </div>

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
            markers={locationsWithDistance}
            onMarkerClick={openLocation}
            userLocation={userLocation}
          />
        </div>

        <h2 className="text-xl md:text-2xl font-semibold text-primary mb-4">CNG Station Directory</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
          {locationsWithDistance.map((location) => (
            <LocationCard
              key={location.id}
              id={location.id}
              name={location.name}
              url={location.url}
              distance={location.distance}
              onOpenLocation={openLocation}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CNGLocationPage;