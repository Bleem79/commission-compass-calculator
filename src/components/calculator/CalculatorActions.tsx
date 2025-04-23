
import { Button } from "@/components/ui/button";
import { RefreshCw, Info, Fuel, MapPin } from 'lucide-react';
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { useAuth } from "@/contexts/AuthContext";

export const CalculatorActions = ({ onReset }: { onReset: () => void }) => {
  const { user, isAdmin } = useAuth();

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
        asChild
        className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
      >
        <DocumentViewer
          bucketName="info-docs"
          title="Info"
          icon={<Info className="h-4 w-4" />}
          isAdmin={isAdmin}
        />
      </Button>

      <Button
        variant="outline"
        asChild
        className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-emerald-600 border border-green-200"
      >
        <DocumentViewer
          bucketName="mfuel-docs"
          title="M-Fuel%"
          icon={<Fuel className="h-4 w-4" />}
          isAdmin={isAdmin}
        />
      </Button>

      <Button
        variant="outline"
        asChild
        className="flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-violet-600 border border-purple-200"
      >
        <DocumentViewer
          bucketName="hotspot-docs"
          title="Hotspot"
          icon={<MapPin className="h-4 w-4" />}
          isAdmin={isAdmin}
        />
      </Button>
    </div>
  );
};
