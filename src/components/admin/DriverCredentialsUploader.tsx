
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { processExcelFile } from "@/utils/excel/processExcelFile";
import { createDriverAccount } from "@/services/driverAccountService";
import { processBatch } from "@/utils/batchProcessor";
import { DownloadTemplateButton } from "./DownloadTemplateButton";

export const DriverCredentialsUploader = () => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setIsUploading(true);
    try {
      const drivers = await processExcelFile(file);
      
      if (!drivers || drivers.length === 0) {
        toast.error("No data found in the uploaded file");
        return;
      }
      
      if (!drivers[0].hasOwnProperty('email') || 
          !drivers[0].hasOwnProperty('password') || 
          !drivers[0].hasOwnProperty('driverId')) {
        toast.error("Invalid template format", { 
          description: "Please use the template provided by the Download Template button" 
        });
        return;
      }

      const toastId = toast.loading("Starting driver credentials processing...");
      
      const results = await processBatch(
        drivers,
        (driver) => createDriverAccount(
          driver.email.toString().trim(), 
          String(driver.password), 
          driver.driverId.toString().trim()
        )
      );
      
      toast.dismiss(toastId);

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
  );
};
