
import React from "react";
import { Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LocationCardProps {
  id: number;
  name: string;
  url: string;
  onOpenLocation: (url: string) => void;
}

const LocationCard: React.FC<LocationCardProps> = ({
  id,
  name,
  url,
  onOpenLocation
}) => {
  return (
    <Card className="bg-white shadow-md hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-3">
              {id}
            </div>
            <h3 className="text-lg font-medium">{name}</h3>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => onOpenLocation(url)}
            className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
          >
            <Navigation size={18} />
            Open in Maps
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationCard;
