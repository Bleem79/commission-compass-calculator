
import { Button } from "@/components/ui/button";
import { RefreshCw, HelpCircle, Fuel, MapPin } from 'lucide-react';
import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { useAuth } from "@/contexts/AuthContext";

interface CalculatorActionsProps {
  onReset: () => void;
}

export const CalculatorActions = ({ onReset }: CalculatorActionsProps) => {
  const { user, isAdmin } = useAuth();

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
      
      <DocumentViewer
        bucketName="info-docs"
        title="Info"
        isAdmin={isAdmin}
      />
      
      <DocumentViewer
        bucketName="mfuel-docs"
        title="M-Fuel%"
        isAdmin={isAdmin}
      />

      <DocumentViewer
        bucketName="hotspot-docs"
        title="Hotspot"
        isAdmin={isAdmin}
      />
    </div>
  );
};
