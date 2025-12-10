import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
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
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  zoom = 13,
  markers,
  onMarkerClick,
}) => {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className="w-full h-full rounded-lg"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={defaultIcon}
        >
          <Popup>
            <div className="p-1">
              <strong className="text-primary">{marker.name}</strong>
              {marker.url && onMarkerClick && (
                <button
                  onClick={() => onMarkerClick(marker.url!)}
                  className="mt-2 block w-full text-sm text-primary hover:underline"
                >
                  Open in Google Maps →
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default LeafletMap;