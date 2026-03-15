import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/calculator/UserProfile";
import LeafletMap from "@/components/map/LeafletMap";
import LocationCard from "@/components/map/LocationCard";
import { MapPin, Loader2 } from "lucide-react";
import { PageLayout } from "@/components/shared/PageLayout";

// CNG location data
const cngLocations = [
  { id: 1, name: "Al Mirqab (771)", url: "https://maps.app.goo.gl/29Cn1UbFJ2v41hbD7", lat: 25.388179251322544, lng: 55.41933347301315 },
  { id: 2, name: "Maysaloon (783)", url: "https://maps.app.goo.gl/3YE7fXz1bZTiWJBs6", lat: 25.36441023851886, lng: 55.4043490141414 },
  { id: 3, name: "Al Shahba (769)", url: "https://maps.app.goo.gl/nT8JLk91Tjm8L72u5", lat: 25.32848025828055, lng: 55.43204902883553 },
  { id: 4, name: "Samnan (799)", url: "https://maps.app.goo.gl/2XhRoq5Rmv22qpAy5", lat: 25.341210543133734, lng: 55.41791154972364 },
  { id: 5, name: "Ajman (Hemaidiya) - 695", url: "https://www.google.com/maps?q=25.38729778575349,55.553135482097005", lat: 25.38729778575349, lng: 55.553135482097005 },
];

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const CNGLocationPage = () => {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
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

  const locationsWithDistance = cngLocations.map((location) => ({
    ...location,
    distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, location.lat, location.lng) : null,
  })).sort((a, b) => {
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  const mapCenter = userLocation || {
    lat: cngLocations.reduce((sum, loc) => sum + loc.lat, 0) / cngLocations.length,
    lng: cngLocations.reduce((sum, loc) => sum + loc.lng, 0) / cngLocations.length,
  };

  const openLocation = useCallback((url: string) => {
    window.open(url, "_blank");
  }, []);

  return (
    <PageLayout
      title="CNG Locations"
      icon={<MapPin className="h-6 w-6" />}
      maxWidth="6xl"
      gradient="from-background via-muted to-muted/50"
    >
      <p className="text-sm text-muted-foreground mb-4">
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
        <UserProfile email={user.email} username={user.username} role={user.role} />
      )}

      {/* Map */}
      <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden border-2 border-border mb-6 mt-6 relative">
        <LeafletMap
          center={mapCenter}
          zoom={13}
          markers={locationsWithDistance}
          onMarkerClick={openLocation}
          userLocation={userLocation}
        />
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-4">CNG Station Directory</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
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
    </PageLayout>
  );
};

export default CNGLocationPage;
