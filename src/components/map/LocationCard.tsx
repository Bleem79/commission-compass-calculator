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
    <Card className="bg-card shadow-md hover:shadow-lg transition-all">
      <CardContent className="p-4 md:p-6">
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center min-w-0">
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-3 text-sm font-bold">
              {id}
            </div>
            <h3 className="text-base md:text-lg font-medium text-foreground truncate">{name}</h3>
          </div>
          
          <Button
            onClick={() => onOpenLocation(url)}
            size="sm"
            className="flex-shrink-0 flex items-center gap-1.5 md:gap-2"
          >
            <Navigation size={16} className="md:w-[18px] md:h-[18px]" />
            <span className="hidden xs:inline">Open in Maps</span>
            <span className="xs:hidden">Maps</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationCard;
