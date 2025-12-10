import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MarkerData {
  id: number;
  name: string;
  lat: number;
  lng: number;
  url?: string;
  distance?: number | null;
}

interface LeafletMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers: MarkerData[];
  onMarkerClick?: (url: string) => void;
  userLocation?: { lat: number; lng: number } | null;
}

// Fix for default marker icons in Leaflet with bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// User location marker (blue dot)
const userIcon = L.divIcon({
  className: "user-location-marker",
  html: `<div style="
    width: 16px;
    height: 16px;
    background-color: #3b82f6;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

const LeafletMap = ({
  center,
  zoom = 13,
  markers,
  onMarkerClick,
  userLocation,
}: LeafletMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([center.lat, center.lng], zoom);
    mapInstanceRef.current = map;

    // Add tile layer (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add user location marker if available
    if (userLocation) {
      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("<strong>Your Location</strong>");
    }

    // Add markers
    markers.forEach((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: defaultIcon,
      }).addTo(map);

      // Click on marker opens Google Maps directly
      if (marker.url && onMarkerClick) {
        leafletMarker.on("click", () => {
          onMarkerClick(marker.url!);
        });
      }

      // Also add popup with info
      let distanceText = "";
      if (marker.distance !== null && marker.distance !== undefined) {
        distanceText = `<br><span style="color: #666; font-size: 12px;">📍 ${formatDistance(marker.distance)}</span>`;
      }
      
      leafletMarker.bindTooltip(
        `<strong>${marker.name}</strong>${distanceText}`,
        { direction: "top", offset: [0, -35] }
      );
    });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, markers, onMarkerClick, userLocation]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" />;
};

export default LeafletMap;