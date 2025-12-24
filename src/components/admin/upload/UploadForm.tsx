
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Download } from "lucide-react";

interface UploadFormProps {
  isUploading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadForm = ({ isUploading, onFileSelect }: UploadFormProps) => {
  const downloadTemplate = () => {
    const csvContent = "driverId,password,status\nDRV001,password123,enabled\nDRV002,password456,disabled";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "driver_credentials_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={downloadTemplate}
          className="flex-1 bg-white hover:bg-gray-50 border-green-200 text-green-700 hover:text-green-800 transition-colors flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          <span>Download Template</span>
        </Button>
        <input
          type="file"
          accept=".csv"
          onChange={onFileSelect}
          className="hidden"
          id="driver-excel-upload"
        />
        <Button
          variant="outline"
          disabled={isUploading}
          onClick={() => document.getElementById("driver-excel-upload")?.click()}
          className="flex-1 bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-800 transition-colors flex items-center gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              <span>Upload CSV</span>
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        CSV columns: <strong>driverId</strong> (required), <strong>password</strong> (required), <strong>status</strong> (optional: enabled/disabled)
      </p>
    </div>
  );
};
