
import { useState } from "react";
import { toast } from "sonner";
import { processExcelFile } from "@/utils/excel/processExcelFile";
import { createDriverAccount } from "@/services/driverAccountService";
import { processBatch } from "@/utils/batchProcessor";
import { UploadForm } from "./upload/UploadForm";
import { UploadProgress } from "./upload/UploadProgress";
import { UploadResults } from "./upload/UploadResults";

export const DriverCredentialsUploader = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState<{
    total: number;
    success: number;
    failed: number;
    errors?: Array<{ email: string; error: string }>;
  } | null>(null);

  const resetStats = () => {
    setUploadStats(null);
    setProgress(0);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetStats();

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setIsUploading(true);
    try {
      const drivers = await processExcelFile(file);
      
      if (!drivers || drivers.length === 0) {
        toast.error("No data found in the uploaded file");
        setIsUploading(false);
        return;
      }
      
      if (!drivers[0].hasOwnProperty('email') || 
          !drivers[0].hasOwnProperty('password') || 
          !drivers[0].hasOwnProperty('driverId')) {
        toast.error("Invalid template format", { 
          description: "Please use the template provided by the Download Template button" 
        });
        setIsUploading(false);
        return;
      }

      const totalDrivers = drivers.length;
      const toastId = toast.loading(`Processing ${totalDrivers} driver credentials...`);
      console.log(`Starting to process ${totalDrivers} driver accounts`);
      
      let completedCount = 0;
      
      const updateProgress = () => {
        completedCount++;
        const newProgress = Math.round((completedCount / totalDrivers) * 100);
        setProgress(newProgress);
        toast.loading(`Processing: ${completedCount}/${totalDrivers} (${newProgress}%)`, { id: toastId });
      };
      
      const results = await processBatch(
        drivers,
        async (driver) => {
          const result = await createDriverAccount(driver.email, String(driver.password), driver.driverId);
          updateProgress();
          return result;
        },
        3,
        5000
      );
      
      toast.dismiss(toastId);
      
      setUploadStats({
        total: drivers.length,
        success: results.success.length,
        failed: results.errors.length,
        errors: results.errors
      });

      if (results.success.length > 0) {
        toast.success(
          `Successfully processed ${results.success.length} driver${results.success.length > 1 ? 's' : ''}${
            results.errors.length > 0 ? ` (${results.errors.length} failed)` : ''
          }`
        );
      }

      if (results.errors.length > 0) {
        toast.error(`Failed to create ${results.errors.length} driver account${results.errors.length > 1 ? 's' : ''}`, {
          description: results.errors[0]?.error || "Unknown error"
        });
      }

      if (results.success.length === 0) {
        toast.error("No driver accounts were created", {
          description: "Please check the file format and try again"
        });
      }

    } catch (error: any) {
      console.error("Error processing driver accounts:", error);
      toast.error("Failed to process driver accounts", {
        description: error.message || "Unknown error occurred"
      });
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div>
      <UploadForm isUploading={isUploading} onFileSelect={handleFileUpload} />
      
      {isUploading && <UploadProgress progress={progress} />}
      
      {uploadStats && <UploadResults stats={uploadStats} />}
    </div>
  );
};
