
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";

interface UploadFormProps {
  isUploading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadForm = ({ isUploading, onFileSelect }: UploadFormProps) => {
  return (
    <div>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileSelect}
        className="hidden"
        id="driver-excel-upload"
      />
      <Button
        variant="outline"
        disabled={isUploading}
        onClick={() => document.getElementById('driver-excel-upload')?.click()}
        className="w-full bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-800 transition-colors flex items-center gap-2"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing - Please wait...</span>
          </>
        ) : (
          <>
            <FileText className="h-4 w-4" />
            <span>Upload Driver Credentials</span>
          </>
        )}
      </Button>
    </div>
  );
};
