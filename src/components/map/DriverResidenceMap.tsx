import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface ResidencePin { key: string; city: string; area: string; count: number; position: { lat: number; lng: number } | null }

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
      const label = document.createElement("span");
      label.className = `residence-pin${selected === group.key ? " residence-pin-selected" : ""}`;
      label.textContent = `${group.area || group.city}-${group.count}`;
      const marker = L.marker(point, { icon: L.divIcon({ className: "residence-pin-host", html: label.outerHTML, iconSize: [0, 0], iconAnchor: [0, 0] }) }).addTo(map);
      const text = document.createElement("span");
      text.textContent = `${group.area || group.city} · ${group.city} · ${group.count} drivers`;
      marker.bindTooltip(text).on("click", () => onSelect(group.key));
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