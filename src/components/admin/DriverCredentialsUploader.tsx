import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { processCSVFile } from "@/utils/csv/processCSVFile";
import { bulkCreateDriverAccounts } from "@/services/driverAccountService";
import { UploadForm } from "./upload/UploadForm";
import { UploadProgress } from "./upload/UploadProgress";
import { UploadResults } from "./upload/UploadResults";

export const DriverCredentialsUploader = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const processingRef = useRef<boolean>(false);
  const [uploadStats, setUploadStats] = useState<{
    total: number;
    success: number;
    failed: number;
    errors?: Array<{ email: string; error: string }>;
  } | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && processingRef.current) {
        toast.info("Upload process is continuing in the background", {
          description: "Please keep this tab open until completion"
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const resetStats = () => {
    setUploadStats(null);
    setProgress(0);
    setCurrentItem(0);
    setTotalItems(0);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetStats();

    if (!file.name.match(/\.csv$/)) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsUploading(true);
    processingRef.current = true;
    
    try {
      const drivers = await processCSVFile(file);
      
      if (!drivers || drivers.length === 0) {
        toast.error("No data found in the uploaded file");
        setIsUploading(false);
        processingRef.current = false;
        return;
      }

      const totalDrivers = drivers.length;
      setTotalItems(totalDrivers);
      
      const results = await bulkCreateDriverAccounts(drivers);

      setUploadStats({
        total: drivers.length,
        success: results.success.length,
        failed: results.errors.length,
        errors: results.errors
      });

      if (results.success.length > 0) {
        toast.success(
          `Successfully created ${results.success.length} driver account${results.success.length > 1 ? 's' : ''}${
            results.errors.length > 0 ? ` (${results.errors.length} failed)` : ''
          }`
        );
      }

      if (results.errors.length > 0) {
        toast.error(`Failed to create ${results.errors.length} driver account${results.errors.length > 1 ? 's' : ''}`, {
          description: "Check the detailed errors below"
        });
      }

    } catch (error: any) {
      console.error("Error processing driver accounts:", error);
      toast.error("Failed to process driver accounts", {
        description: error.message || "Unknown error occurred"
      });
    } finally {
      setIsUploading(false);
      processingRef.current = false;
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <UploadForm isUploading={isUploading} onFileSelect={handleFileUpload} />
      
      {isUploading && (
        <UploadProgress 
          progress={progress}
          currentItem={currentItem}
          totalItems={totalItems}
        />
      )}
      
      {uploadStats && <UploadResults stats={uploadStats} />}
    </div>
  );
};
