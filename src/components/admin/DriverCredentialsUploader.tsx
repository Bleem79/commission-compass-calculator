
import { useState, useRef, useEffect } from "react";
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
  const [currentItem, setCurrentItem] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const processingRef = useRef<boolean>(false);
  const [uploadStats, setUploadStats] = useState<{
    total: number;
    success: number;
    failed: number;
    errors?: Array<{ email: string; error: string }>;
  } | null>(null);

  // Handle tab visibility changes to provide feedback when returning to the tab
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

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setIsUploading(true);
    processingRef.current = true;
    
    try {
      const drivers = await processExcelFile(file);
      
      if (!drivers || drivers.length === 0) {
        toast.error("No data found in the uploaded file");
        setIsUploading(false);
        processingRef.current = false;
        return;
      }
      
      if (!drivers[0].hasOwnProperty('email') || 
          !drivers[0].hasOwnProperty('password') || 
          !drivers[0].hasOwnProperty('driverId')) {
        toast.error("Invalid template format", { 
          description: "Please use the template provided by the Download Template button" 
        });
        setIsUploading(false);
        processingRef.current = false;
        return;
      }

      const totalDrivers = drivers.length;
      setTotalItems(totalDrivers);
      
      const toastId = toast.loading(`Processing ${totalDrivers} driver credentials...`, {
        duration: 0 // Make the toast persist until dismissed
      });
      
      console.log(`Starting to process ${totalDrivers} driver accounts`);
      
      let completedCount = 0;
      
      const updateProgress = () => {
        completedCount++;
        setCurrentItem(completedCount);
        const newProgress = Math.round((completedCount / totalDrivers) * 100);
        setProgress(newProgress);
        
        // Update the toast but don't dismiss it
        toast.loading(`Processing: ${completedCount}/${totalDrivers} (${newProgress}%)`, { 
          id: toastId,
          duration: 0
        });
      };
      
      // Use smaller batch size and longer delay to avoid RLS policy issues
      const results = await processBatch(
        drivers,
        async (driver) => {
          const result = await createDriverAccount(driver.email, String(driver.password), driver.driverId);
          updateProgress();
          return result;
        },
        2, // Smaller batch size
        7000 // Longer delay
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
          description: "Check the detailed errors below"
        });
      }

      if (results.success.length === 0 && results.errors.length > 0) {
        toast.error("No driver accounts were created", {
          description: "Please check RLS policies and database permissions"
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
    <div>
      <UploadForm isUploading={isUploading} onFileSelect={handleFileUpload} />
      
      {isUploading && <UploadProgress progress={progress} currentItem={currentItem} totalItems={totalItems} />}
      
      {uploadStats && <UploadResults stats={uploadStats} />}
    </div>
  );
};
