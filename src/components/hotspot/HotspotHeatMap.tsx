import React from "react";
import { BarChart3 } from "lucide-react";

interface HotspotData {
  id: number;
  name: string;
  percentage: number;
}

const hotspotData: HotspotData[] = [
  { id: 1, name: "Al Qasimiah", percentage: 21 },
  { id: 2, name: "Al Majaz", percentage: 19 },
  { id: 3, name: "Al Nahda", percentage: 13 },
  { id: 4, name: "Sharjah Industrial Area", percentage: 12 },
  { id: 5, name: "Al Sharq", percentage: 6 },
  { id: 6, name: "Muweileh", percentage: 6 },
  { id: 7, name: "Al Gharb", percentage: 7 },
];

const getHeatColor = (percentage: number): string => {
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

const HotspotHeatMap = () => {
  const maxPercentage = Math.max(...hotspotData.map((d) => d.percentage));

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="text-indigo-600" size={20} />
        <h3 className="text-xl font-semibold text-indigo-800">
          Hotspot Distribution
        </h3>
      </div>

      {/* Side by Side Layout */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Location List - Left Side */}
        <div className="md:w-1/2 space-y-3">
          {hotspotData.map((item) => (
            <div key={item.id} className="flex items-center gap-3 h-8">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${getHeatColor(
                  item.percentage
                )}`}
              >
                {item.id}
              </div>
              <div className="text-sm font-medium text-indigo-800">
                Top {item.id}- {item.name}
              </div>
            </div>
          ))}
        </div>

        {/* Heat Bars - Right Side */}
        <div className="md:w-1/2 space-y-3">
          {hotspotData.map((item) => (
            <div key={item.id} className="h-8 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getHeatColorBar(
                  item.percentage
                )} rounded-full transition-all duration-500 ease-out`}
                style={{
                  width: `${(item.percentage / maxPercentage) * 100}%`,
                }}
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
  );
};

export default HotspotHeatMap;
