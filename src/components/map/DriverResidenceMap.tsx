import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface ResidencePin { key: string; city: string; area: string; count: number; position: { lat: number; lng: number } | null }

// Same blue teardrop pin style as CNG Locations
const pinIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function DriverResidenceMap({ groups, selected, onSelect }: { groups: ResidencePin[]; selected: string | null; onSelect: (key: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const pins = groups.filter(g => g.position);
    if (!pins.length) return;
    const map = L.map(host.current);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles &copy; Esri", maxZoom: 19 }).addTo(map);
    const bounds = L.latLngBounds([]);
    for (const group of pins) {
      const position = group.position;
      if (!position) continue;
      const point: L.LatLngExpression = [position.lat, position.lng];
      bounds.extend(point);
      const marker = L.marker(point, { icon: pinIcon }).addTo(map);
      const label = document.createElement("span");
      label.className = `residence-pin-label${selected === group.key ? " residence-pin-label-selected" : ""}`;
      label.textContent = `${group.area || group.city}-${group.count}`;
      marker.bindTooltip(label, { permanent: true, direction: "bottom", offset: [0, 4], className: "residence-pin-tooltip" });
      marker.on("click", () => onSelect(group.key));
    }
    const focus = pins.find(g => g.key === selected)?.position;
    if (focus) map.setView([focus.lat, focus.lng], 14);
    else map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(host.current);
    return () => { observer.disconnect(); map.remove(); };
  }, [groups, selected, onSelect]);
  return <div ref={host} className="h-full w-full" aria-label="Driver residence map" />;
}