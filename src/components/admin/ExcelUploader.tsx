
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const ExcelUploader = () => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is Excel
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Invalid file type", {
        description: "Please upload an Excel file (.xlsx or .xls)"
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `data-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('driver-data')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      toast.success("File uploaded successfully", {
        description: "The data file has been uploaded and will be processed shortly."
      });
    } catch (error: any) {
      toast.error("Upload failed", {
        description: error.message || "Failed to upload file. Please try again."
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
        id="data-upload"
      />
      <Button
        variant="outline"
        disabled={isUploading}
        onClick={() => document.getElementById('data-upload')?.click()}
        className="w-full bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-800 transition-colors flex items-center gap-2"
      >
        {isUploading ? (
          "Uploading..."
        ) : (
          <>
            <Upload className="h-4 w-4" />
            <span>Upload Data</span>
          </>
        )}
      </Button>
    </div>
  );
};

