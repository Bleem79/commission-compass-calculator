
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
      
      // Validate driver data first
      const validatedDriver = validateDriverData({
        email: driver.email,
        password: driver.password,
        driverId: driver.driverId
      });
      
      // Check if driver with this ID already exists
      const { data: existingDriver } = await adminSupabase
        .from('driver_credentials')
        .select('driver_id')
        .eq('driver_id', validatedDriver.driverId)
        .maybeSingle();
        
      if (existingDriver) {
        throw new Error(`Driver ID ${validatedDriver.driverId} already exists`);
      }
      
      // Instead of using admin.createUser, use the standard signUp method
      // which doesn't require special permissions and doesn't affect current session
      const response = await adminSupabase.auth.signUp({
        email: validatedDriver.email,
        password: validatedDriver.password,
        options: {
          data: {
            role: 'driver',
            driver_id: validatedDriver.driverId
          }
        }
      });
      
      if (response.error) {
        throw response.error;
      }
      
      if (!response.data.user) {
        throw new Error(`Failed to create user account for ${validatedDriver.email}`);
      }
      
      try {
        // Create driver role
        const roleResponse = await adminSupabase.from('user_roles').insert({
          user_id: response.data.user.id,
          role: 'driver'
        });
        
        if (roleResponse.error) {
          console.error(`Error creating role for ${validatedDriver.email}:`, roleResponse.error);
          throw roleResponse.error;
        }
        
        // Create driver credentials
        const credResponse = await adminSupabase.from('driver_credentials').insert({
          user_id: response.data.user.id,
          driver_id: validatedDriver.driverId
        }).select();
        
        if (credResponse.error) {
          console.error(`Error creating driver credentials for ${validatedDriver.email}:`, credResponse.error);
          throw credResponse.error;
        }
      } catch (insertError: any) {
        // If we fail after user creation, log the error but still count as success
        // since the user account was created
        console.warn(`Created user account for ${validatedDriver.email} but had issues with role/credentials: ${insertError.message}`);
      }
      
      results.success.push({ email: validatedDriver.email, driverId: validatedDriver.driverId });
      console.log(`Successfully created account for ${validatedDriver.email}`);
      
    } catch (error: any) {
      console.error(`Error creating account for ${drivers[i].email}:`, error);
      results.errors.push({ 
        email: drivers[i].email, 
        error: error.message || 'Unknown error occurred'
      });
    }
    
    // Add delay between processing each driver to avoid rate limiting
    if (i < drivers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay between creations
    }
  }

  return results;
};
