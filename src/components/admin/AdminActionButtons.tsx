
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { DownloadTemplateButton } from "./DownloadTemplateButton";

export const AdminActionButtons = () => {
  const navigate = useNavigate();

  return (
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
        onClick={() => document.getElementById('excel-upload')?.click()}
        className="w-full bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-800 transition-colors"
      >
        Upload Excel
      </Button>
      <Button
        variant="outline"
        onClick={() => document.getElementById('driver-excel-upload')?.click()}
        className="w-full bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-800 transition-colors"
      >
        Upload Driver Credentials
      </Button>
      <DownloadTemplateButton />
    </div>
  );
};
