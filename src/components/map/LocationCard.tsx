import { Navigation, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LocationCardProps {
  id: number;
  name: string;
  url: string;
  distance?: number | null;
  onOpenLocation: (url: string) => void;
}

const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

const LocationCard = ({
  id,
  name,
  url,
  distance,
  onOpenLocation,
}: LocationCardProps) => {
  return (
    <Card className="bg-card shadow-md hover:shadow-lg transition-all">
      <CardContent className="p-4 md:p-6">
        <div className="flex justify-between items-center gap-3">
          <div className="flex items-center min-w-0 flex-1">
            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center mr-3 text-sm font-bold">
              {id}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base md:text-lg font-medium text-foreground truncate">
                {name}
              </h3>
              {distance !== null && distance !== undefined && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {formatDistance(distance)}
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={() => onOpenLocation(url)}
            size="sm"
            className="flex-shrink-0 flex items-center gap-1.5 h-9 px-3"
          >
            <Navigation size={16} />
            <span>Maps</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationCard;