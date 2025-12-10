
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Home, MapPin } from "lucide-react";
import { DocumentCategory } from "@/components/documents/DocumentCategory";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const HotspotPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const hotspotLocations = [
    {
      id: 1,
      name: "Top 1- Al Qasimiah",
      lat: 25.3435926,
      lng: 55.3960874,
    },
    {
      id: 2,
      name: "Top 2- Al Majaz",
      lat: 25.322572,
      lng: 55.3874166,
    },
  ];

  // Pink dashed boundary line coordinates (Al Qasimiah border) - matches the reference image
  const boundaryLineCoords: [number, number][] = [
    [25.3580, 55.362], // Start near Al Jubail/waterfront
    [25.3578, 55.367],
    [25.3575, 55.372],
    [25.3570, 55.377], // Near Al Mareija
    [25.3568, 55.382],
    [25.3565, 55.387], // Near Rolla Square Park
    [25.3560, 55.392],
    [25.3558, 55.397],
    [25.3555, 55.402], // Near Al Manakh
    [25.3550, 55.407],
    [25.3548, 55.412], // Near Al Fayha Park
    [25.3545, 55.417],
    [25.3540, 55.422], // End past Al Fayha Park
  ];

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Calculate center point between all locations
    const centerLat = hotspotLocations.reduce((sum, loc) => sum + loc.lat, 0) / hotspotLocations.length;
    const centerLng = hotspotLocations.reduce((sum, loc) => sum + loc.lng, 0) / hotspotLocations.length;

    // Initialize the map
    const map = L.map(mapRef.current).setView(
      [centerLat, centerLng],
      13
    );

    // Add ESRI World Street Map tiles (English labels)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
      }
    ).addTo(map);

    // Add the pink dashed boundary line
    L.polyline(boundaryLineCoords, {
      color: "#EC4899",
      weight: 4,
      dashArray: "10, 10",
      opacity: 0.9,
    }).addTo(map);

    // Add markers for each hotspot location
    hotspotLocations.forEach((location) => {
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background-color: #0EA5E9;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
          ">${location.id}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([location.lat, location.lng], {
        icon: customIcon,
      }).addTo(map);

      marker.bindPopup(
        `<div style="text-align: center; padding: 4px;">
          <strong>${location.name}</strong>
        </div>`
      );
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleGoHome = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-6">
          <h1 className="text-3xl font-bold text-indigo-800">Hotspot</h1>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGoHome}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
            >
              <Home size={16} />
              Back to Home
            </Button>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="text-indigo-600" size={20} />
            <h3 className="text-xl font-semibold text-indigo-800">
              Hotspot Locations
            </h3>
          </div>
          <div
            ref={mapRef}
            className="w-full h-[300px] md:h-[400px] rounded-lg overflow-hidden border border-indigo-200"
          />
          {/* Location List */}
          <div className="mt-4 space-y-2">
            {hotspotLocations.map((location) => (
              <div key={location.id} className="flex items-center gap-2 text-sm text-indigo-700">
                <span className="bg-sky-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {location.id}
                </span>
                <span>{location.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-4 md:p-6">
          {(user?.role === "admin" || user?.role === "guest") && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold border-b border-indigo-100 pb-2">
                Documents
              </h3>
              <DocumentCategory title="Hotspot" bucketName="hotspot_documents" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotspotPage;
