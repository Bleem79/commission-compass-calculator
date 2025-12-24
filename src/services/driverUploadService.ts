
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateDriverData } from "@/utils/driverValidation";
import { processCSVFile } from "@/utils/csv/processCSVFile";

interface DriverUploadResult {
  success: Array<{ driverId: string }>;
  errors: Array<{ driverId: string; error: string }>;
  total: number;
}

interface UploadProgress {
  current: number;
  total: number;
  currentDriverId: string;
}

export const uploadDriverCredential = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<DriverUploadResult> => {
  // Process CSV file to extract driver data
  const drivers = await processCSVFile(file);
  
  if (!drivers || drivers.length === 0) {
    throw new Error("No data found in the uploaded file");
  }

  const totalDrivers = drivers.length;
  
  // Process drivers one by one and collect results
  const results = {
    success: [] as { driverId: string }[],
    errors: [] as { driverId: string; error: string }[],
    total: totalDrivers
  };
  
  // Delete all existing driver credentials before uploading fresh data
  console.log("Deleting all existing driver credentials...");
  const { error: deleteError } = await supabase
    .from('driver_credentials')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records (workaround for deleting all)
  
  if (deleteError) {
    console.error("Error deleting existing driver credentials:", deleteError);
    throw new Error("Failed to clear existing driver credentials: " + deleteError.message);
  }
  console.log("Successfully deleted all existing driver credentials");
  
  // Process each driver using the database function for proper user linking
  for (let i = 0; i < drivers.length; i++) {
    const driver = drivers[i];
    
    // Report progress
    onProgress?.({
      current: i + 1,
      total: totalDrivers,
      currentDriverId: driver.driverId || `Driver ${i + 1}`
    });
    
    try {
      // Validate driver data first
      const validatedData = validateDriverData({
        password: driver.password,
        driverId: driver.driverId,
        status: driver.status
      });
      
      // Create driver email format
      const driverEmail = `${validatedData.driverId.toLowerCase()}@driver.temp`;
      
      // Use the database function to create/link driver account
      // This function properly handles existing auth users and links them correctly
      const { data: userId, error: createError } = await supabase.rpc('create_driver_account', {
        p_email: driverEmail,
        p_password: validatedData.password,
        p_driver_id: validatedData.driverId
      });
      
      if (createError) {
        // Check if it's a duplicate driver_id error
        if (createError.message.includes('already exists')) {
          console.log(`Driver ${validatedData.driverId} already exists, skipping...`);
          results.success.push({ driverId: validatedData.driverId });
        } else {
          throw createError;
        }
      } else {
        console.log(`Successfully created/linked driver ${validatedData.driverId} with user_id: ${userId}`);
        
        // Update status if needed (function defaults to 'enabled')
        if (validatedData.status === 'disabled') {
          await supabase
            .from('driver_credentials')
            .update({ status: 'disabled' })
            .eq('driver_id', validatedData.driverId);
        }
        
        results.success.push({ driverId: validatedData.driverId });
      }
      
    } catch (error: any) {
      console.error(`Error creating account for ${drivers[i].driverId}:`, error);
      results.errors.push({ 
        driverId: drivers[i].driverId, 
        error: error.message || 'Unknown error occurred'
      });
    }
    
    // Add small delay between processing to avoid rate limiting
    if (i < drivers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
};
