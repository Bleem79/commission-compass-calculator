
import { Button } from "@/components/ui/button";
import { RefreshCw, HelpCircle, Fuel, MapPin } from 'lucide-react';

interface CalculatorActionsProps {
  onReset: () => void;
  onInfoClick: () => void;
  onFuelClick: () => void;
  onHotspotClick: () => void;
}

export const CalculatorActions = ({
  onReset,
  onInfoClick,
  onFuelClick,
  onHotspotClick
}: CalculatorActionsProps) => {
  return (
    <div className="grid grid-cols-4 gap-4 mt-4">
      <Button
        variant="secondary"
        onClick={onReset}
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-100 to-purple-100 hover:from-pink-200 hover:to-purple-200 border border-purple-200"
      >
        <RefreshCw className="h-4 w-4" />
        Reset
      </Button>
      
      <Button
        variant="secondary"
        onClick={onInfoClick}
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-100 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 border border-blue-200"
      >
        <HelpCircle className="h-4 w-4" />
        Info
      </Button>
      
      <Button
        variant="secondary"
        onClick={onFuelClick}
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-100 to-teal-100 hover:from-green-200 hover:to-teal-200 border border-green-200"
      >
        <Fuel className="h-4 w-4" />
        M-Fuel%
      </Button>

      <Button
        variant="secondary"
        onClick={onHotspotClick}
        className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-100 to-yellow-100 hover:from-orange-200 hover:to-yellow-200 border border-orange-200"
      >
        <MapPin className="h-4 w-4" />
        Hotspot
      </Button>
    </div>
  );
};
