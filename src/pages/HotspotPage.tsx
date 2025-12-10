
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

  const hotspotLocation = {
    name: "Top 1- Al Qasimiah",
    lat: 25.3435926,
    lng: 55.3960874,
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize the map
    const map = L.map(mapRef.current).setView(
      [hotspotLocation.lat, hotspotLocation.lng],
      15
    );

    // Add ESRI World Street Map tiles (English labels)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
      }
    ).addTo(map);

    // Create custom marker icon
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
        ">1</div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });

    // Add marker
    const marker = L.marker([hotspotLocation.lat, hotspotLocation.lng], {
      icon: customIcon,
    }).addTo(map);

    // Add popup
    marker.bindPopup(
      `<div style="text-align: center; padding: 4px;">
        <strong>${hotspotLocation.name}</strong>
      </div>`
    );

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
              {hotspotLocation.name}
            </h3>
          </div>
          <div
            ref={mapRef}
            className="w-full h-[300px] md:h-[400px] rounded-lg overflow-hidden border border-indigo-200"
          />
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
