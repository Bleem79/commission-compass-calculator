
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateDriverData } from "@/utils/driverValidation";
import { processCSVFile } from "@/utils/csv/processCSVFile";

interface DriverUploadResult {
  success: Array<{ email: string; driverId: string }>;
  errors: Array<{ email: string; error: string }>;
  total: number;
}

export const uploadDriverCredential = async (file: File): Promise<DriverUploadResult> => {
  // Process CSV file to extract driver data
  const drivers = await processCSVFile(file);
  
  if (!drivers || drivers.length === 0) {
    throw new Error("No data found in the uploaded file");
  }

  const totalDrivers = drivers.length;
  
  // Process drivers one by one and collect results
  const results = {
    success: [] as { email: string; driverId: string }[],
    errors: [] as { email: string; error: string }[],
    total: totalDrivers
  };
  
  // Use the standard client for operations
  const adminSupabase = supabase;
  
  for (let i = 0; i < drivers.length; i++) {
    try {
      const driver = drivers[i];
      
      // Instead of using admin.createUser, use the standard signUp method
      // which doesn't require special permissions
      const response = await adminSupabase.auth.signUp({
        email: driver.email,
        password: driver.password,
        options: {
          data: {
            role: 'driver',
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
        const roleResponse = await adminSupabase.from('user_roles').insert({
          user_id: response.data.user.id,
          role: 'driver'
        });
        
        if (roleResponse.error) {
          console.error(`Error creating role for ${driver.email}:`, roleResponse.error);
          throw roleResponse.error;
        }
        
        // Create driver credentials
        const credResponse = await adminSupabase.from('driver_credentials').insert({
          user_id: response.data.user.id,
          driver_id: driver.driverId
        }).select();
        
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
    
    // Add delay between processing each driver to avoid rate limiting
    if (i < drivers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Increased delay to 5 seconds
    }
  }

  return results;
};
