
import { supabase } from "@/integrations/supabase/client";

export const createDriverAccount = async (email: string, password: string, driverId: string) => {
  console.log(`Attempting to create driver account for ${email} with Driver ID: ${driverId}`);

  try {
    const passwordStr = String(password).trim();
    
    if (!email || !passwordStr || !driverId) {
      throw new Error(`Missing required fields for driver: ${email}`);
    }
    
    // Add retry mechanism for network issues
    let retryCount = 0;
    const maxRetries = 2; // Reduced from 3 to 2
    
    while (retryCount < maxRetries) {
      try {
        // Check if user already exists
        const { data: existingUsers, error: checkError } = await supabase
          .from('driver_credentials')
          .select('user_id')
          .eq('driver_id', driverId);
        
        if (checkError) {
          console.error(`Error checking existing driver: ${checkError.message}`);
          throw checkError;
        }
        
        if (existingUsers && existingUsers.length > 0) {
          throw new Error(`Driver with ID ${driverId} already exists`);
        }
        
        // Check if email is already registered - use a more efficient method
        const { data: userExists, error: userCheckError } = await supabase.auth.admin.getUserByEmail(email);
        
        if (userExists) {
          throw new Error(`Email ${email} is already registered`);
        }
        
        // Create the user account with autoconfirm enabled
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: passwordStr,
          email_confirm: true, // Auto-confirm the email
          user_metadata: {
            driver_id: driverId
          }
        });

        if (authError) {
          console.error(`Authentication error for ${email}:`, authError);
          throw authError;
        }

        if (!authData.user) {
          throw new Error(`No user returned for ${email}`);
        }

        console.log(`User created with ID: ${authData.user.id}`);

        // Assign driver role - use Promise.all to parallelize operations
        const [roleResult, credResult] = await Promise.all([
          supabase.from('user_roles').insert({
            user_id: authData.user.id,
            role: 'driver'
          }),
          supabase.from('driver_credentials').insert({
            user_id: authData.user.id,
            driver_id: driverId
          }).select()
        ]);
        
        const roleError = roleResult.error;
        const credentialsError = credResult.error;
        const credData = credResult.data;

        if (roleError) {
          console.error(`Role assignment error for ${email}:`, roleError);
          throw roleError;
        }

        if (credentialsError) {
          console.error(`Driver credentials insertion error for ${email}:`, credentialsError);
          throw credentialsError;
        }

        console.log(`Driver credentials created:`, credData);
        console.log(`Successfully created driver account for ${email} with Driver ID: ${driverId}`);
        
        return authData;
      } catch (err: any) {
        retryCount++;
        
        // If it's a network error, retry after a shorter delay
        if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('network'))) {
          console.log(`Network error on attempt ${retryCount}. Retrying in ${retryCount}s...`);
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000)); // Reduced delay
          
          if (retryCount < maxRetries) {
            continue;
          }
        }
        
        // For other errors or if we've exhausted retries, throw the error
        throw err;
      }
    }
    
    throw new Error(`Failed after ${maxRetries} retries`);
  } catch (error) {
    console.error(`Error in createDriverAccount for ${email}:`, error);
    throw error;
  }
};
