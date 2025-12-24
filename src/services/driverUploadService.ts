
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
  
  // Store the current session to prevent losing it
  const { data: currentSession } = await supabase.auth.getSession();
  
  // Use the standard client for operations
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
      
      // Check if driver with this ID already exists
      const { data: existingDriver } = await supabase
        .from('driver_credentials')
        .select('driver_id')
        .eq('driver_id', validatedData.driverId)
        .maybeSingle();
        
      if (existingDriver) {
        throw new Error(`Driver ID ${validatedData.driverId} already exists`);
      }
      
      // Create new driver using signUp with driver ID-based email
      // Format: {driverId}@driver.temp - this allows login with just Driver ID
      const driverEmail = `${validatedData.driverId}@driver.temp`;
      
      const response = await supabase.auth.signUp({
        email: driverEmail,
        password: validatedData.password,
        options: {
          data: {
            role: 'driver',
            driver_id: validatedData.driverId
          },
          // Critical: Do not automatically sign in as the new user
          emailRedirectTo: window.location.origin
        }
      });
      
      if (response.error) {
        throw response.error;
      }
      
      if (!response.data.user) {
        throw new Error(`Failed to create user account for Driver ID: ${validatedData.driverId}`);
      }
      
      try {
        // Create driver role
        const roleResponse = await supabase.from('user_roles').insert({
          user_id: response.data.user.id,
          role: 'driver'
        });
        
        if (roleResponse.error) {
          console.error(`Error creating role for ${validatedData.driverId}:`, roleResponse.error);
          throw roleResponse.error;
        }
        
        // Create driver credentials with status
        const credResponse = await supabase.from('driver_credentials').insert({
          user_id: response.data.user.id,
          driver_id: validatedData.driverId,
          status: validatedData.status
        }).select();
        
        if (credResponse.error) {
          console.error(`Error creating driver credentials for ${validatedData.driverId}:`, credResponse.error);
          throw credResponse.error;
        }
      } catch (insertError: any) {
        // If we fail after user creation, log the error but still count as success
        // since the user account was created
        console.warn(`Created user account for ${validatedData.driverId} but had issues with role/credentials: ${insertError.message}`);
      }
      
      results.success.push({ driverId: validatedData.driverId });
      console.log(`Successfully created account for Driver ID: ${validatedData.driverId}`);
      
    } catch (error: any) {
      console.error(`Error creating account for ${drivers[i].driverId}:`, error);
      results.errors.push({ 
        driverId: drivers[i].driverId, 
        error: error.message || 'Unknown error occurred'
      });
    }
    
    // Add delay between processing each driver to avoid rate limiting
    if (i < drivers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Every few records, check if the session is still active and restore it if needed
    if (i % 5 === 0 && currentSession?.session) {
      const { data: newSession } = await supabase.auth.getSession();
      if (!newSession.session && currentSession.session) {
        console.log("Attempting to restore admin session...");
        await supabase.auth.setSession({
          access_token: currentSession.session.access_token,
          refresh_token: currentSession.session.refresh_token
        });
      }
    }
  }

  // Final check to ensure admin session is maintained
  if (currentSession?.session) {
    const { data: finalSession } = await supabase.auth.getSession();
    if (!finalSession.session) {
      console.log("Restoring admin session after completion...");
      await supabase.auth.setSession({
        access_token: currentSession.session.access_token,
        refresh_token: currentSession.session.refresh_token
      });
    }
  }

  return results;
};
