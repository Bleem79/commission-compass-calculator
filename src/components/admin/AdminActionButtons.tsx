
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ExcelUploader } from "./ExcelUploader";
import { DriverCredentialsUploader } from "./DriverCredentialsUploader";
import { useAuth } from "@/contexts/AuthContext";

export const AdminActionButtons = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  // If the user is not an admin, don't render anything
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Button
        variant="outline"
        onClick={() => navigate('/commission-table')}
        className="w-full bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-800 transition-colors"
      >
        View Commission Table
      </Button>
      
      <ExcelUploader />
      
      <DriverCredentialsUploader />
    </div>
  );
};
