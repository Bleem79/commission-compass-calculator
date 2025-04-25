
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { processExcelFile } from "@/utils/excel/processExcelFile";
import { createDriverAccount } from "@/services/driverAccountService";
import { processBatch } from "@/utils/batchProcessor";
import { DownloadTemplateButton } from "./DownloadTemplateButton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export const DriverCredentialsUploader = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    total: number;
    success: number;
    failed: number;
    errors?: Array<{ email: string; error: string }>;
  } | null>(null);

  const resetStats = () => {
    setUploadStats(null);
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
      // Process the Excel file
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

      const toastId = toast.loading(`Processing ${drivers.length} driver credentials...`);
      console.log(`Starting to process ${drivers.length} driver accounts`);
      
      // Process in smaller batches with longer delays
      const results = await processBatch(
        drivers,
        (driver) => createDriverAccount(
          driver.email, 
          String(driver.password), 
          driver.driverId
        ),
        1, // Process only 1 at a time for maximum reliability
        8000 // Wait 8 seconds between batches
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
          }`,
          {
            description: "Driver accounts created and roles assigned in the database",
            action: {
              label: "View Details",
              onClick: () => console.log("Successful Drivers:", results.success)
            }
          }
        );
      }

      if (results.errors.length > 0) {
        const errorMessage = results.errors.map(e => `${e.email}: ${e.error}`).join('\n');
        console.error("Detailed error list:", results.errors);
        
        toast.error(`Failed to create ${results.errors.length} driver account${results.errors.length > 1 ? 's' : ''}`, {
          description: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage,
          action: {
            label: "View Errors",
            onClick: () => console.error("Driver Creation Errors:", results.errors)
          }
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
        description: error.message
      });
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DownloadTemplateButton />
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
          id="driver-excel-upload"
        />
        <Button
          variant="outline"
          disabled={isUploading}
          onClick={() => document.getElementById('driver-excel-upload')?.click()}
          className="flex items-center gap-2"
        >
          {isUploading ? (
            "Processing..."
          ) : (
            <>
              <FileText className="h-4 w-4" />
              <span>Upload Driver Credentials</span>
            </>
          )}
        </Button>
      </div>
      
      {uploadStats && (
        <Alert variant={uploadStats.failed > 0 ? "destructive" : "default"}>
          <AlertTitle>Upload Results</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <div>
                Total: {uploadStats.total} | 
                Successful: {uploadStats.success} | 
                Failed: {uploadStats.failed}
              </div>
              
              {uploadStats.failed > 0 && uploadStats.errors && (
                <div className="text-sm mt-2">
                  <strong>Common error reasons:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Email already exists in system</li>
                    <li>Driver ID already exists</li>
                    <li>Network connection issues</li>
                    <li>Rate limiting from the authentication service</li>
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
