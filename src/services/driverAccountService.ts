
import { supabase } from "@/integrations/supabase/client";

export const createDriverAccount = async (email: string, password: string, driverId: string) => {
  console.log(`Attempting to create driver account for ${email} with Driver ID: ${driverId}`);

  try {
    const passwordStr = String(password).trim();
    
    if (!email || !passwordStr || !driverId) {
      throw new Error(`Missing required fields for driver: ${email}`);
    }
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: passwordStr,
    });

    if (authError) {
      console.error(`Authentication error for ${email}:`, authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error(`No user returned for ${email}`);
    }

    console.log(`User created with ID: ${authData.user.id}`);

    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: authData.user.id,
      role: 'driver'
    });

    if (roleError) {
      console.error(`Role assignment error for ${email}:`, roleError);
      throw roleError;
    }

    console.log(`Role assigned for user: ${email}`);

    const { data: credData, error: credentialsError } = await supabase.from('driver_credentials').insert({
      user_id: authData.user.id,
      driver_id: driverId
    }).select();

    if (credentialsError) {
      console.error(`Driver credentials insertion error for ${email}:`, credentialsError);
      throw credentialsError;
    }

    console.log(`Driver credentials created:`, credData);
    console.log(`Successfully created driver account for ${email} with Driver ID: ${driverId}`);
    
    return authData;
  } catch (error) {
    console.error(`Error in createDriverAccount for ${email}:`, error);
    throw error;
  }
};
