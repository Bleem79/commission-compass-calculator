
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

export const DriverCredentialsUploader = () => {
  const [isUploading, setIsUploading] = useState(false);

  const processExcelFile = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  const createDriverAccount = async (email: string, password: string, driverId: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    if (authData.user) {
      // Set driver role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'driver'
      });

      if (roleError) throw roleError;

      // Create driver credentials entry
      const { error: credentialsError } = await supabase.from('driver_credentials').insert({
        user_id: authData.user.id,
        driver_id: driverId
      });

      if (credentialsError) throw credentialsError;

      console.log(`Created driver account for ${email} with ID ${driverId}`);
    }

    return authData;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    setIsUploading(true);
    try {
      const drivers = await processExcelFile(file) as Array<{ email: string, password: string, driverId: string }>;
      
      let successCount = 0;
      let errorCount = 0;
      const errors: { email: string; error: string }[] = [];

      const toastId = toast.loading("Processing driver credentials...");

      for (const driver of drivers) {
        try {
          await createDriverAccount(driver.email, driver.password, driver.driverId);
          successCount++;
          console.log(`Created driver account for ${driver.email}`);
          
          // Show incremental progress
          toast.loading(`Processed ${successCount} of ${drivers.length} drivers...`, {
            id: toastId
          });
        } catch (error: any) {
          console.error(`Failed to create driver account for ${driver.email}:`, error);
          errors.push({ email: driver.email, error: error.message });
          errorCount++;
        }
      }

      // Dismiss the loading toast
      toast.dismiss(toastId);

      // Show final success/error toast
      if (successCount > 0) {
        toast.success(
          `Successfully processed ${successCount} driver${successCount > 1 ? 's' : ''}${
            errorCount > 0 ? ` (${errorCount} failed)` : ''
          }`, {
          description: "Driver accounts have been created and roles assigned"
        });
      }

      // Show detailed error toast if there were any failures
      if (errorCount > 0) {
        const errorMessage = errors.map(e => `${e.email}: ${e.error}`).join('\n');
        toast.error(`Failed to create ${errorCount} driver account${errorCount > 1 ? 's' : ''}`, {
          description: errorMessage
        });
      }

      // Show toast if no accounts were created
      if (successCount === 0) {
        toast.error("No driver accounts were created", {
          description: "Please check the file format and try again"
        });
      }

    } catch (error: any) {
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
