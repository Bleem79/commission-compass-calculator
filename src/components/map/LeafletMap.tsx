import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MarkerData {
  id: number;
  name: string;
  lat: number;
  lng: number;
  url?: string;
}

interface LeafletMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers: MarkerData[];
  onMarkerClick?: (url: string) => void;
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

const LeafletMap = ({
  center,
  zoom = 13,
  markers,
  onMarkerClick,
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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add markers
    markers.forEach((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng], { icon: defaultIcon }).addTo(map);
      
      const popupContent = document.createElement("div");
      popupContent.className = "p-1";
      popupContent.innerHTML = `<strong style="color: hsl(var(--primary))">${marker.name}</strong>`;
      
      if (marker.url && onMarkerClick) {
        const button = document.createElement("button");
        button.textContent = "Open in Google Maps →";
        button.className = "mt-2 block w-full text-sm hover:underline";
        button.style.color = "hsl(var(--primary))";
        button.onclick = () => onMarkerClick(marker.url!);
        popupContent.appendChild(button);
      }
      
      leafletMarker.bindPopup(popupContent);
    });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, markers, onMarkerClick]);

  return <div ref={mapRef} className="w-full h-full rounded-lg" />;
};

export default LeafletMap;