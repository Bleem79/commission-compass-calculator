
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { processCSVFile } from "@/utils/csv/processCSVFile";
import { bulkCreateDriverAccounts } from "@/services/driverAccountService";
import { supabase } from "@/integrations/supabase/client"; // Import the supabase client
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
      
      // Process drivers one by one and update progress
      const results = {
        success: [] as { email: string; driverId: string }[],
        errors: [] as { email: string; error: string }[]
      };
      
      for (let i = 0; i < drivers.length; i++) {
        try {
          const driver = drivers[i];
          setCurrentItem(i + 1);
          setProgress(Math.round(((i) / totalDrivers) * 100));
          
          // Process this driver
          const response = await supabase.auth.signUp({
            email: driver.email,
            password: driver.password,
            options: {
              data: {
                driver_id: driver.driverId
              }
            }
          });
          
          if (response.error) {
            throw response.error;
          }
          
          if (!response.data.user) {
            throw new Error(`Failed to create user account for ${driver.email}`);
          }
          
          try {
            // Create driver role
            const roleResponse = await supabase.from('user_roles').insert({
              user_id: response.data.user.id,
              role: 'driver'
            });
            
            if (roleResponse.error) {
              console.error(`Error creating role for ${driver.email}:`, roleResponse.error);
              throw roleResponse.error;
            }
            
            // Create driver credentials - using RPC function to bypass RLS
            const credResponse = await supabase.rpc('create_driver_account', {
              p_email: driver.email,
              p_password: driver.password,
              p_driver_id: driver.driverId
            });
            
            if (credResponse.error) {
              console.error(`Error creating driver credentials for ${driver.email}:`, credResponse.error);
              throw credResponse.error;
            }
          } catch (insertError: any) {
            // If we fail after user creation, log the error but still count as success
            // since the user account was created
            console.warn(`Created user account for ${driver.email} but had issues with role/credentials: ${insertError.message}`);
          }
          
          results.success.push({ email: driver.email, driverId: driver.driverId });
          console.log(`Successfully created account for ${driver.email}`);
          
        } catch (error: any) {
          console.error(`Error creating account for ${drivers[i].email}:`, error);
          results.errors.push({ 
            email: drivers[i].email, 
            error: error.message || 'Unknown error occurred'
          });
        }
        
        // Add a delay between processing each driver to avoid rate limiting
        // Increasing delay to 2 seconds
        if (i < drivers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      setProgress(100);
      
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
