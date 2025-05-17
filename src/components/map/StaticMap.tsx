
import React from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface StaticMapProps {
  mapUrl: string;
  alt?: string;
}

const StaticMap: React.FC<StaticMapProps> = ({ 
  mapUrl, 
  alt = "Static map of locations" 
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <AspectRatio ratio={16/9} className="overflow-hidden">
        <img 
          src={mapUrl} 
          alt={alt} 
          className="rounded-lg shadow-md w-full h-full object-cover" 
        />
      </AspectRatio>
    </div>
  );
};

export default StaticMap;
