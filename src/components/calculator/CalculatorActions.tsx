
import { Button } from "@/components/ui/button";
import { RefreshCw, Info, Percent, Wifi } from 'lucide-react';
import { useNavigate } from "react-router-dom";

export const CalculatorActions = ({ onReset }: { onReset: () => void }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-4 gap-4 mt-4">
      <Button
        variant="secondary"
        onClick={onReset}
        className="flex items-center justify-center gap-2 bg-pink-50 hover:bg-pink-100 text-rose-600 border border-pink-200"
      >
        <RefreshCw className="h-4 w-4" />
        Reset
      </Button>
      
      <Button
        variant="outline"
        onClick={() => navigate('/info')}
        className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
      >
        <Info className="h-4 w-4" />
        Info
      </Button>

      <Button
        variant="outline"
        onClick={() => navigate('/m-fuel')}
        className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-emerald-600 border border-green-200"
      >
        <Percent className="h-4 w-4" />
        M-Fuel%
      </Button>

      <Button
        variant="outline"
        onClick={() => navigate('/hotspot')}
        className="flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-violet-600 border border-purple-200"
      >
        <Wifi className="h-4 w-4" />
        Hotspot
      </Button>
    </div>
  );
};
