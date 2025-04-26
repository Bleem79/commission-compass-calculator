
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
    const passwordStr = String(password).trim();
    
    if (!email || !passwordStr || !driverId) {
      throw new Error(`Missing required fields for driver: ${email}`);
    }
    
    // Add retry mechanism for network issues
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        // Check if driver already exists by ID
        const { data: existingDrivers, error: driverCheckError } = await supabase
          .from('driver_credentials')
          .select('driver_id')
          .eq('driver_id', driverId);
        
        if (driverCheckError) {
          console.error(`Error checking existing driver: ${driverCheckError.message}`);
          throw driverCheckError;
        }
        
        if (existingDrivers && existingDrivers.length > 0) {
          throw new Error(`Driver with ID ${driverId} already exists`);
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
          user.email && user.email.toLowerCase() === email.toLowerCase()
        );
        
        if (existingUser) {
          throw new Error(`Email ${email} is already registered`);
        }
        
        // Create the user with the auth admin API
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: passwordStr,
          email_confirm: true,
          user_metadata: {
            driver_id: driverId
          }
        });

        if (createError) {
          console.error(`Authentication error for ${email}:`, createError);
          
          // Check for specific error types and provide more helpful messages
          if (createError.message.includes('duplicate key value')) {
            throw new Error(`Email ${email} is already registered in the system`);
          } else if (createError.message.includes('minimum password length')) {
            throw new Error(`Password for ${email} doesn't meet minimum requirements (at least 6 characters)`);
          } else {
            throw createError;
          }
        }

        if (!authData.user) {
          throw new Error(`No user returned for ${email}`);
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
          console.error(`Role assignment error for ${email}:`, roleError);
          throw roleError;
        }

        // Then create driver credentials 
        const { data: credData, error: credError } = await supabase
          .from('driver_credentials')
          .insert({
            user_id: authData.user.id,
            driver_id: driverId
          })
          .select();
        
        if (credError) {
          console.error(`Driver credentials insertion error for ${email}:`, credError);
          throw credError;
        }

        console.log(`Driver credentials created:`, credData);
        console.log(`Successfully created driver account for ${email} with Driver ID: ${driverId}`);
        
        return authData;
      } catch (err) {
        retryCount++;
        const error = err as Error | AuthError;
        
        // If it's a network error, retry after a short delay
        if (error.message && 
           (error.message.includes('Failed to fetch') || 
            error.message.includes('network'))) {
          console.log(`Network error on attempt ${retryCount}. Retrying in ${retryCount}s...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
          
          if (retryCount <= maxRetries) {
            continue;
          }
        }
        
        // For other errors or if we've exhausted retries, throw the error
        throw error;
      }
    }
    
    throw new Error(`Failed after ${maxRetries} retries`);
  } catch (error) {
    console.error(`Error in createDriverAccount for ${email}:`, error);
    throw error;
  }
};
