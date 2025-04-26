
import { supabase } from "@/integrations/supabase/client";
import { AuthError } from "@supabase/supabase-js";
import { processBatch } from "@/utils/batchProcessor";

interface DriverData {
  email: string;
  password: string;
  driverId: string;
}

export const createDriverAccount = async (email: string, password: string, driverId: string) => {
  console.log(`Attempting to create driver account for ${email} with Driver ID: ${driverId}`);

  try {
    // Normalize inputs to prevent common errors
    const emailStr = String(email).trim().toLowerCase();
    const passwordStr = String(password).trim();
    const driverIdStr = String(driverId).trim();
    
    if (!emailStr || !passwordStr || !driverIdStr) {
      throw new Error(`Missing required fields for driver: ${email}`);
    }
    
    // Validate email format
    if (!emailStr.includes('@')) {
      throw new Error(`Invalid email format: ${email}`);
    }
    
    // Validate password length
    if (passwordStr.length < 6) {
      throw new Error(`Password for ${email} is too short (minimum 6 characters)`);
    }
    
    // Check if driver already exists by ID - check this first as it's faster
    const { data: existingDrivers, error: driverCheckError } = await supabase
      .from('driver_credentials')
      .select('driver_id')
      .eq('driver_id', driverIdStr);
    
    if (driverCheckError) {
      console.error(`Error checking existing driver: ${driverCheckError.message}`);
      throw driverCheckError;
    }
    
    if (existingDrivers && existingDrivers.length > 0) {
      throw new Error(`Driver with ID ${driverIdStr} already exists`);
    }
    
    // Instead of using admin.listUsers which requires elevated privileges,
    // check if we can directly create the user and handle any uniqueness errors
    const { data: authData, error: createError } = await supabase.auth.signUp({
      email: emailStr,
      password: passwordStr,
      options: {
        data: {
          driver_id: driverIdStr
        }
      }
    });

    if (createError) {
      // Check for specific error types
      if (createError.message.includes('User already registered')) {
        throw new Error(`Email ${emailStr} is already registered in the system`);
      } else if (createError.message.includes('password') || createError.message.includes('Password')) {
        throw new Error(`Password for ${emailStr} doesn't meet requirements (at least 6 characters)`);
      } else {
        throw createError;
      }
    }

    if (!authData.user) {
      throw new Error(`No user returned for ${emailStr}`);
    }

    console.log(`User created with ID: ${authData.user.id}`);
    
    // Create driver role entry first
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'driver'
      });
      
    if (roleError) {
      console.error(`Role assignment error for ${emailStr}:`, roleError);
      // If we hit an RLS policy error, we should abort
      if (roleError.message.includes('violates row-level security') || 
          roleError.message.includes('permission denied')) {
        throw roleError;
      }
      
      // For other errors, we might want to continue with the driver credential creation
      console.warn(`Continuing despite role assignment error for ${emailStr}`);
    }

    // Then create driver credentials 
    const { data: credData, error: credError } = await supabase
      .from('driver_credentials')
      .insert({
        user_id: authData.user.id,
        driver_id: driverIdStr
      })
      .select();
    
    if (credError) {
      console.error(`Driver credentials insertion error for ${emailStr}:`, credError);
      throw credError;
    }

    console.log(`Driver credentials created:`, credData);
    console.log(`Successfully created driver account for ${emailStr} with Driver ID: ${driverIdStr}`);
    
    return authData;
    
  } catch (error) {
    console.error(`Error in createDriverAccount for ${email}:`, error);
    throw error;
  }
};

export const bulkCreateDriverAccounts = async (drivers: DriverData[]) => {
  console.log(`Starting bulk creation of ${drivers.length} driver accounts`);
  
  const results = {
    success: [] as { email: string; driverId: string }[],
    errors: [] as { email: string; error: string }[]
  };

  for (const driver of drivers) {
    try {
      // Normalize inputs
      const email = String(driver.email).trim().toLowerCase();
      const password = String(driver.password).trim();
      const driverId = String(driver.driverId).trim();

      // Basic validation
      if (!email || !password || !driverId) {
        throw new Error(`Missing required fields for driver: ${email}`);
      }

      // Check if driver already exists by ID - this is the problematic query
      const { data: existingDriverData, error: checkError } = await supabase
        .from('driver_credentials')
        .select('driver_id')
        .eq('driver_id', driverId);

      // Fix for the "JSON object requested, multiple (or no) rows returned" error
      // We're not using .single() anymore, so we need to check the array
      if (checkError) {
        console.error(`Error checking for existing driver ID ${driverId}:`, checkError);
        // Only throw if it's not a "no rows" error
        if (!checkError.message.includes('No rows found')) {
          throw checkError;
        }
      }

      // Check if any drivers were returned with this ID
      if (existingDriverData && existingDriverData.length > 0) {
        throw new Error(`Driver ID ${driverId} already exists`);
      }

      // Create user account
      const { data: authData, error: createError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            driver_id: driverId
          }
        }
      });

      if (createError) {
        if (createError.message.includes('already registered')) {
          throw new Error(`Email ${email} already exists in the system`);
        } else {
          throw createError;
        }
      }

      if (!authData.user) {
        throw new Error(`Failed to create user account for ${email}`);
      }

      // Create driver role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'driver'
        });

      if (roleError) {
        console.error(`Error creating role for ${email}:`, roleError);
        // Continue anyway - we'll still try to create the driver record
      }

      // Create driver credentials
      const { error: credError } = await supabase
        .from('driver_credentials')
        .insert({
          user_id: authData.user.id,
          driver_id: driverId
        });

      if (credError) {
        console.error(`Error creating driver credentials for ${email}:`, credError);
        throw credError;
      }

      results.success.push({ email, driverId });
      console.log(`Successfully created account for ${email}`);

    } catch (error: any) {
      console.error(`Error creating account for ${driver.email}:`, error);
      results.errors.push({ 
        email: driver.email, 
        error: error.message || 'Unknown error occurred'
      });
    }

    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Bulk creation completed. Success: ${results.success.length}, Errors: ${results.errors.length}`);
  return results;
};
