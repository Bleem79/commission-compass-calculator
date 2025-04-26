
import { supabase } from "@/integrations/supabase/client";
import { AuthError } from "@supabase/supabase-js";

// Define a type for the user object returned by supabase.auth.admin.listUsers()
interface SupabaseUser {
  id: string;
  email?: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  created_at?: string;
}

// Define the response type for the listUsers function
interface ListUsersResponse {
  users?: SupabaseUser[];
  total?: number;
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
