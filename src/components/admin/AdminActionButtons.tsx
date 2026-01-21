import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExcelUploader } from "./ExcelUploader";
import { DriverCredentialsUploader } from "./DriverCredentialsUploader";
import { DriverPortalSettingsDialog } from "./DriverPortalSettingsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { Settings2 } from "lucide-react";

export const AdminActionButtons = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [showPortalSettings, setShowPortalSettings] = useState(false);
  
  // If the user is not an admin, don't render anything
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => navigate('/commission-table')}
          className="w-full bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-800 transition-colors"
        >
          View Commission Table
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setShowPortalSettings(true)}
          className="w-full bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-800 transition-colors flex items-center justify-center gap-2"
        >
          <Settings2 className="h-4 w-4" />
          Driver Portal Settings
        </Button>
        
        <ExcelUploader />
        
        <DriverCredentialsUploader />
      </div>

      <DriverPortalSettingsDialog 
        open={showPortalSettings} 
        onOpenChange={setShowPortalSettings} 
      />
    </>
  );
};
