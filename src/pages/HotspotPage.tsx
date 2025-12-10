
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
      googleMapsUrl: "https://www.google.com/maps/place/Hay+Al+Qasimiah+-+Sharjah/@25.3427558,55.3748056,4076m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3e5f5bd03489bdb5:0x3769999c6a02985e!8m2!3d25.3435926!4d55.3960874",
    },
    {
      id: 2,
      name: "Top 2- Al Majaz",
      lat: 25.322572,
      lng: 55.3874166,
      googleMapsUrl: "https://www.google.com/maps/place/Al+Majaz+-+Sharjah/@25.338269,55.3959631,6854m/data=!3m1!1e3!4m6!3m5!1s0x3e5f5bc023b9ae1f:0xbce03df60d9b845e!8m2!3d25.322572!4d55.3874166",
    },
    {
      id: 3,
      name: "Top 3- Al Nahda",
      lat: 25.3019448,
      lng: 55.3761806,
      googleMapsUrl: "https://www.google.com/maps/place/Hay+Al+Nahda+-+Sharjah/@25.3034626,55.3702951,3428m/data=!3m1!1e3!4m6!3m5!1s0x3e5f5c769ceaebc5:0x87ef0a2e9e93dfdc!8m2!3d25.3019448!4d55.3761806",
    },
    {
      id: 4,
      name: "Top 4- Sharjah Industrial Area",
      lat: 25.3090368,
      lng: 55.4208324,
      googleMapsUrl: "https://www.google.com/maps/place/Industrial+Area+-+Sharjah/@25.3001447,55.3907926,16308m/data=!3m1!1e3!4m6!3m5!1s0x3e5f5ec7d43763cd:0xe46c75259954fcf1!8m2!3d25.3090368!4d55.4208324",
    },
    {
      id: 5,
      name: "Top 5- Al Sharq",
      lat: 25.3661404,
      lng: 55.4016444,
      googleMapsUrl: "https://www.google.com/maps/place/Hay+Al+Sharq+-+Sharjah/@25.3673183,55.393429,4075m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3e5f5a214ff9db81:0xf05b844fb31e8e41!8m2!3d25.3661404!4d55.4016444",
    },
    {
      id: 6,
      name: "Top 6- Muweileh",
      lat: 25.3096921,
      lng: 55.4626017,
      googleMapsUrl: "https://www.google.com/maps/place/Muwaileh+Commercial+-+Sharjah/@25.3072153,55.4414291,8153m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3e5f5f1ab69d4249:0x127fa82fc0a859b4!8m2!3d25.3096921!4d55.4626017",
    },
    {
      id: 7,
      name: "Top 7- Al Gharb",
      lat: 25.3550736,
      lng: 55.391724,
      googleMapsUrl: "https://www.google.com/maps/place/Hay+Al+Gharb+-+Sharjah/@25.3581384,55.3860706,2038m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3e5f5a2dabcde77b:0x2c936421fee8ea66!8m2!3d25.3550736!4d55.391724",
    },
  ];

  const openGoogleMaps = (url: string) => {
    window.open(url, "_blank");
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Calculate center point between all locations
    const centerLat = hotspotLocations.reduce((sum, loc) => sum + loc.lat, 0) / hotspotLocations.length;
    const centerLng = hotspotLocations.reduce((sum, loc) => sum + loc.lng, 0) / hotspotLocations.length;

    // Initialize the map
    const map = L.map(mapRef.current).setView(
      [centerLat, centerLng],
      12
    );

    // Add ESRI World Street Map tiles (English labels)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles &copy; Esri",
      }
    ).addTo(map);

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
            cursor: pointer;
          ">${location.id}</div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const marker = L.marker([location.lat, location.lng], {
        icon: customIcon,
      }).addTo(map);

      // Open Google Maps on marker click
      marker.on("click", () => {
        window.open(location.googleMapsUrl, "_blank");
      });
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
              <div 
                key={location.id} 
                className="flex items-center gap-2 text-sm text-indigo-700 cursor-pointer hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                onClick={() => openGoogleMaps(location.googleMapsUrl)}
              >
                <span className="bg-sky-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {location.id}
                </span>
                <span className="hover:underline">{location.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HotspotPage;
