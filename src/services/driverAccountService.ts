
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
    
    // Add retry mechanism for network issues
    let retryCount = 0;
    const maxRetries = 5; // Increased from 3 to 5
    let lastError: Error | null = null;
    
    while (retryCount <= maxRetries) {
      try {
        // Check if driver already exists by ID
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
        
        // Check if email is already registered in auth system
        const { data: listUsersData, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
          console.error(`Error checking existing users: ${usersError.message}`);
          throw usersError;
        }
        
        // Properly type the response to avoid TypeScript errors
        const userList: ListUsersResponse = listUsersData || { users: [] };
        
        const existingUser = userList.users?.find(user => 
          user.email && user.email.toLowerCase() === emailStr.toLowerCase()
        );
        
        if (existingUser) {
          throw new Error(`Email ${emailStr} is already registered`);
        }
        
        // Create the user with the auth admin API
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
          email: emailStr,
          password: passwordStr,
          email_confirm: true,
          user_metadata: {
            driver_id: driverIdStr
          }
        });

        if (createError) {
          console.error(`Authentication error for ${emailStr}:`, createError);
          
          // Check for specific error types and provide more helpful messages
          if (createError.message.includes('duplicate key value')) {
            throw new Error(`Email ${emailStr} is already registered in the system`);
          } else if (createError.message.includes('minimum password length')) {
            throw new Error(`Password for ${emailStr} doesn't meet minimum requirements (at least 6 characters)`);
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
      } catch (err) {
        retryCount++;
        const error = err as Error | AuthError;
        lastError = error;
        
        // If it's a network error or a rate limit error, retry after a short delay
        if (error.message && 
           (error.message.includes('Failed to fetch') || 
            error.message.includes('network') ||
            error.message.includes('Too many requests') ||
            error.message.includes('timeout') ||
            error.message.includes('rate limit'))) {
          console.log(`Network or rate limit error on attempt ${retryCount}. Retrying in ${retryCount * 2}s...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
          
          if (retryCount <= maxRetries) {
            continue;
          }
        } else if (error.message &&
                  (error.message.includes('already exists') ||
                   error.message.includes('already registered') ||
                   error.message.includes('duplicate key'))) {
          // Don't retry for conflicts
          console.error(`User already exists error for ${emailStr}, not retrying:`, error);
          throw error;
        }
        
        // For other errors or if we've exhausted retries, throw the error
        if (retryCount > maxRetries) {
          console.error(`Failed after ${maxRetries} retries for ${emailStr}`);
        } else {
          console.error(`Non-retryable error for ${emailStr}:`, error);
        }
        throw error;
      }
    }
    
    throw lastError || new Error(`Failed after ${maxRetries} retries`);
  } catch (error) {
    console.error(`Error in createDriverAccount for ${email}:`, error);
    throw error;
  }
};
