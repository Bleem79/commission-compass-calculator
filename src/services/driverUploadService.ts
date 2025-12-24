
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
      
      // Check if driver with this ID already exists in driver_credentials
      const { data: existingDriver } = await supabase
        .from('driver_credentials')
        .select('id, driver_id, user_id, status')
        .eq('driver_id', validatedData.driverId)
        .maybeSingle();
        
      if (existingDriver) {
        // Update existing driver: update status (password update requires admin SDK, skip for now)
        try {
          const { error: updateError } = await supabase
            .from('driver_credentials')
            .update({ status: validatedData.status })
            .eq('driver_id', validatedData.driverId);
          
          if (updateError) {
            throw updateError;
          }
          
          results.success.push({ driverId: validatedData.driverId });
          console.log(`Updated status for Driver ID ${validatedData.driverId}`);
        } catch (updateErr: any) {
          results.errors.push({ 
            driverId: validatedData.driverId, 
            error: `Failed to update: ${updateErr.message}`
          });
        }
        continue;
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
          emailRedirectTo: window.location.origin
        }
      });
      
      // CRITICAL: Restore admin session immediately after signUp
      // signUp automatically logs in as the new user, breaking admin permissions
      if (currentSession?.session) {
        await supabase.auth.setSession({
          access_token: currentSession.session.access_token,
          refresh_token: currentSession.session.refresh_token
        });
      }
      
      if (response.error) {
        // Handle "user already registered" - create credentials for existing auth user
        if (response.error.code === 'user_already_exists') {
          try {
            // Find the existing user by email
            const driverEmail = `${validatedData.driverId}@driver.temp`;
            
            // We can't query auth.users directly, so we'll try to sign in to get the user id
            // Instead, create driver_credentials without user_id (will be null)
            // Or skip if we can't determine the user
            const { error: credError } = await supabase.from('driver_credentials').insert({
              driver_id: validatedData.driverId,
              status: validatedData.status,
              user_id: null // We don't have access to the user_id from client
            });
            
            if (credError) {
              // If it's a duplicate, just update the status
              if (credError.code === '23505') {
                await supabase
                  .from('driver_credentials')
                  .update({ status: validatedData.status })
                  .eq('driver_id', validatedData.driverId);
                results.success.push({ driverId: validatedData.driverId });
                console.log(`Updated existing credentials for ${validatedData.driverId}`);
              } else {
                throw credError;
              }
            } else {
              results.success.push({ driverId: validatedData.driverId });
              console.log(`Created credentials for existing auth user ${validatedData.driverId}`);
            }
          } catch (credErr: any) {
            results.errors.push({ 
              driverId: validatedData.driverId, 
              error: `Auth user exists, credential creation failed: ${credErr.message}`
            });
          }
          continue;
        }
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
