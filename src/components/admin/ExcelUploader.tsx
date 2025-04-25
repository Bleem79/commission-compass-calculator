
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileExcel, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const ExcelUploader = () => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is Excel
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `drivers-data-${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('driver-data')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      toast({
        title: "File uploaded successfully",
        description: "The Excel file has been uploaded and will be processed shortly.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload file. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        className="hidden"
        id="excel-upload"
      />
      <Button
        variant="outline"
        disabled={isUploading}
        onClick={() => document.getElementById('excel-upload')?.click()}
        className="flex items-center gap-2"
      >
        {isUploading ? (
          "Uploading..."
        ) : (
          <>
            <FileExcel className="h-4 w-4" />
            <span>Upload Excel</span>
          </>
        )}
      </Button>
    </div>
  );
};
