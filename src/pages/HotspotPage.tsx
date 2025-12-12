import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, MapPin, BarChart3 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const hotspotLocations = [
  {
    id: 1,
    name: "Al Qasimiah",
    percentage: 21,
    lat: 25.3435926,
    lng: 55.3960874,
    googleMapsUrl: "https://www.google.com/maps/place/Hay+Al+Qasimiah+-+Sharjah/@25.3427558,55.3748056,4076m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3e5f5bd03489bdb5:0x3769999c6a02985e!8m2!3d25.3435926!4d55.3960874",
  },
  {
    id: 2,
    name: "Al Majaz",
    percentage: 19,
    lat: 25.322572,
    lng: 55.3874166,
    googleMapsUrl: "https://www.google.com/maps/place/Al+Majaz+-+Sharjah/@25.338269,55.3959631,6854m/data=!3m1!1e3!4m6!3m5!1s0x3e5f5bc023b9ae1f:0xbce03df60d9b845e!8m2!3d25.322572!4d55.3874166",
  },
  {
    id: 3,
    name: "Al Nahda",
    percentage: 13,
    lat: 25.3019448,
    lng: 55.3761806,
    googleMapsUrl: "https://www.google.com/maps/place/Hay+Al+Nahda+-+Sharjah/@25.3034626,55.3702951,3428m/data=!3m1!1e3!4m6!3m5!1s0x3e5f5c769ceaebc5:0x87ef0a2e9e93dfdc!8m2!3d25.3019448!4d55.3761806",
  },
  {
    id: 4,
    name: "Sharjah Industrial Area",
    percentage: 12,
    lat: 25.3090368,
    lng: 55.4208324,
    googleMapsUrl: "https://www.google.com/maps/place/Industrial+Area+-+Sharjah/@25.3001447,55.3907926,16308m/data=!3m1!1e3!4m6!3m5!1s0x3e5f5ec7d43763cd:0xe46c75259954fcf1!8m2!3d25.3090368!4d55.4208324",
  },
  {
    id: 5,
    name: "Al Sharq",
    percentage: 6,
    lat: 25.3661404,
    lng: 55.4016444,
    googleMapsUrl: "https://www.google.com/maps/place/Hay+Al+Sharq+-+Sharjah/@25.3673183,55.393429,4075m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3e5f5a214ff9db81:0xf05b844fb31e8e41!8m2!3d25.3661404!4d55.4016444",
  },
  {
    id: 6,
    name: "Muweileh",
    percentage: 6,
    lat: 25.3096921,
    lng: 55.4626017,
    googleMapsUrl: "https://www.google.com/maps/place/Muwaileh+Commercial+-+Sharjah/@25.3072153,55.4414291,8153m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3e5f5f1ab69d4249:0x127fa82fc0a859b4!8m2!3d25.3096921!4d55.4626017",
  },
  {
    id: 7,
    name: "Al Gharb",
    percentage: 7,
    lat: 25.3550736,
    lng: 55.391724,
    googleMapsUrl: "https://www.google.com/maps/place/Hay+Al+Gharb+-+Sharjah/@25.3581384,55.3860706,2038m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3e5f5a2dabcde77b:0x2c936421fee8ea66!8m2!3d25.3550736!4d55.391724",
  },
];

const getHeatColor = (percentage: number): string => {
  if (percentage >= 20) return "#ef4444"; // red-500
  if (percentage >= 15) return "#f97316"; // orange-500
  if (percentage >= 10) return "#eab308"; // yellow-500
  if (percentage >= 7) return "#84cc16"; // lime-500
  return "#22c55e"; // green-500
};

const getHeatColorClass = (percentage: number): string => {
  if (percentage >= 20) return "bg-red-500";
  if (percentage >= 15) return "bg-orange-500";
  if (percentage >= 10) return "bg-yellow-500";
  if (percentage >= 7) return "bg-lime-500";
  return "bg-green-500";
};

const getHeatColorBar = (percentage: number): string => {
  if (percentage >= 20) return "from-red-600 to-red-400";
  if (percentage >= 15) return "from-orange-600 to-orange-400";
  if (percentage >= 10) return "from-yellow-600 to-yellow-400";
  if (percentage >= 7) return "from-lime-600 to-lime-400";
  return "from-green-600 to-green-400";
};

const HotspotPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const maxPercentage = Math.max(...hotspotLocations.map((d) => d.percentage));

  const openGoogleMaps = (url: string) => {
    window.open(url, "_blank");
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const centerLat = hotspotLocations.reduce((sum, loc) => sum + loc.lat, 0) / hotspotLocations.length;
    const centerLng = hotspotLocations.reduce((sum, loc) => sum + loc.lng, 0) / hotspotLocations.length;

    const map = L.map(mapRef.current).setView([centerLat, centerLng], 12);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles &copy; Esri" }
    ).addTo(map);

    // Add markers with intensity colors
    hotspotLocations.forEach((location) => {
      const markerColor = getHeatColor(location.percentage);
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="
            background-color: ${markerColor};
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

      const marker = L.marker([location.lat, location.lng], { icon: customIcon }).addTo(map);
      
      // Add tooltip showing location name and percentage
      marker.bindTooltip(`<strong>${location.name}</strong><br>${location.percentage}%`, {
        permanent: false,
        direction: "top",
        offset: [0, -16],
        className: "custom-tooltip",
      });
      
      marker.on("click", () => window.open(location.googleMapsUrl, "_blank"));
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-6">
          <h1 className="text-3xl font-bold text-indigo-800">Hotspot</h1>
          <Button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
          >
            <Home size={16} />
            Back to Home
          </Button>
        </div>

        {/* Map Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-4 md:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="text-indigo-600" size={20} />
            <h3 className="text-xl font-semibold text-indigo-800">Hotspot Locations</h3>
          </div>
          <div
            ref={mapRef}
            className="w-full h-[300px] md:h-[400px] rounded-lg overflow-hidden border border-indigo-200"
          />
        </div>

        {/* Heat Map Distribution */}
        <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="text-indigo-600" size={20} />
            <h3 className="text-xl font-semibold text-indigo-800">Hotspot Distribution</h3>
          </div>

          {/* Side by Side Layout */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Location List - Left Side */}
            <div className="md:w-1/2 space-y-3">
              {hotspotLocations.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 h-8 cursor-pointer hover:bg-indigo-50 rounded-lg px-2 transition-colors"
                  onClick={() => openGoogleMaps(item.googleMapsUrl)}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${getHeatColorClass(
                      item.percentage
                    )}`}
                  >
                    {item.id}
                  </div>
                  <div className="text-sm font-medium text-indigo-800 hover:underline">
                    Top {item.id}- {item.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Heat Bars - Right Side */}
            <div className="md:w-1/2 space-y-3">
              {hotspotLocations.map((item) => (
                <div
                  key={item.id}
                  className="h-8 bg-gray-100 rounded-full overflow-hidden cursor-pointer"
                  onClick={() => openGoogleMaps(item.googleMapsUrl)}
                >
                  <div
                    className={`h-full bg-gradient-to-r ${getHeatColorBar(
                      item.percentage
                    )} rounded-full transition-all duration-500 ease-out hover:opacity-80`}
                    style={{ width: `${(item.percentage / maxPercentage) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-indigo-100">
            <p className="text-xs text-gray-500 mb-2">Heat Intensity Legend:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-red-500" />
                <span className="text-gray-600">Very High (≥20%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-orange-500" />
                <span className="text-gray-600">High (15-19%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-yellow-500" />
                <span className="text-gray-600">Medium (10-14%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-lime-500" />
                <span className="text-gray-600">Low (7-9%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-gray-600">Very Low (&lt;7%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotPage;
