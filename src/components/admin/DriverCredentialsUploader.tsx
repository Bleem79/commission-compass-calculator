
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { generateUserTemplate } from "@/utils/excel/generateUserTemplate";

export const DriverCredentialsUploader = () => {
  const [isUploading, setIsUploading] = useState(false);

  const downloadTemplate = () => {
    try {
      const template = generateUserTemplate();
      
      // Create a blob from the template
      const blob = new Blob([template], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'driver_upload_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Template downloaded successfully", {
        description: "Use this template to prepare your driver data for upload"
      });
    } catch (error: any) {
      toast.error("Failed to download template", {
        description: error.message
      });
    }
  };

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
          
          // Add logging to see the parsed data
          console.log("Parsed Excel data:", jsonData);
          
          resolve(jsonData);
        } catch (error) {
          console.error("Error processing Excel file:", error);
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  const createDriverAccount = async (email: string, password: string, driverId: string) => {
    console.log(`Attempting to create driver account for ${email} with Driver ID: ${driverId}`);

    try {
      // Ensure password is a string and trim any whitespace
      const passwordStr = String(password).trim();
      
      if (!email || !passwordStr || !driverId) {
        throw new Error(`Missing required fields for driver: ${email}`);
      }
      
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: passwordStr,
      });

      if (authError) {
        console.error(`Authentication error for ${email}:`, authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error(`No user returned for ${email}`);
      }

      console.log(`User created with ID: ${authData.user.id}`);

      // Set driver role
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: 'driver'
      });

      if (roleError) {
        console.error(`Role assignment error for ${email}:`, roleError);
        throw roleError;
      }

      console.log(`Role assigned for user: ${email}`);

      // Create driver credentials entry
      const { data: credData, error: credentialsError } = await supabase.from('driver_credentials').insert({
        user_id: authData.user.id,
        driver_id: driverId
      }).select();

      if (credentialsError) {
        console.error(`Driver credentials insertion error for ${email}:`, credentialsError);
        throw credentialsError;
      }

      console.log(`Driver credentials created:`, credData);
      console.log(`Successfully created driver account for ${email} with Driver ID: ${driverId}`);
      
      return authData;
    } catch (error) {
      console.error(`Error in createDriverAccount for ${email}:`, error);
      throw error;
    }
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
      const drivers = await processExcelFile(file) as Array<{ email: string, password: string | number, driverId: string }>;
      
      if (!drivers || drivers.length === 0) {
        toast.error("No data found in the uploaded file");
        setIsUploading(false);
        return;
      }
      
      // Validate data structure
      if (!drivers[0].hasOwnProperty('email') || 
          !drivers[0].hasOwnProperty('password') || 
          !drivers[0].hasOwnProperty('driverId')) {
        toast.error("Invalid template format", { 
          description: "Please use the template provided by the Download Template button" 
        });
        setIsUploading(false);
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      const errors: { email: string; error: string }[] = [];

      const toastId = toast.loading("Processing driver credentials...");

      for (const driver of drivers) {
        try {
          // Ensure all required fields are present
          if (!driver.email || !driver.password || !driver.driverId) {
            throw new Error("Missing required fields");
          }
          
          // Ensure password is passed as a string
          await createDriverAccount(
            driver.email.toString().trim(), 
            String(driver.password), 
            driver.driverId.toString().trim()
          );
          successCount++;
          
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

      // Detailed success toast
      if (successCount > 0) {
        toast.success(
          `Successfully processed ${successCount} driver${successCount > 1 ? 's' : ''}${
            errorCount > 0 ? ` (${errorCount} failed)` : ''
          }`, {
          description: "Driver accounts created and roles assigned in the database",
          action: {
            label: "View Details",
            onClick: () => {
              console.log("Successful Drivers:", 
                drivers.filter((_, index) => 
                  !errors.some(err => err.email === drivers[index].email)
                )
              );
            }
          }
        });
      }

      // Detailed error toast
      if (errorCount > 0) {
        const errorMessage = errors.map(e => `${e.email}: ${e.error}`).join('\n');
        toast.error(`Failed to create ${errorCount} driver account${errorCount > 1 ? 's' : ''}`, {
          description: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage,
          action: {
            label: "View Errors",
            onClick: () => {
              console.error("Driver Creation Errors:", errors);
            }
          }
        });
      }

      // Show toast if no accounts were created
      if (successCount === 0) {
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
      <Button
        variant="outline"
        onClick={downloadTemplate}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        <span>Download Template</span>
      </Button>
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
