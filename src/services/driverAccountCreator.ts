
import { supabase } from "@/integrations/supabase/client";
import { validateDriverData } from "@/utils/driverValidation";
import { checkExistingDriver, createDriverRole, createDriverCredentials } from "./driverDbService";

export const createDriverAccount = async (email: string, password: string, driverId: string) => {
  console.log(`Attempting to create driver account for ${email} with Driver ID: ${driverId}`);

  try {
    const validatedData = validateDriverData({ email, password, driverId });
    
    const existingDrivers = await checkExistingDriver(validatedData.driverId);
    
    if (existingDrivers && existingDrivers.length > 0) {
      throw new Error(`Driver with ID ${validatedData.driverId} already exists`);
    }
    
    const { data: authData, error: createError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          driver_id: validatedData.driverId
        },
        // Don't automatically sign in the new user
        emailRedirectTo: window.location.origin
      }
    });

    if (createError) {
      if (createError.message.includes('User already registered')) {
        throw new Error(`Email ${validatedData.email} is already registered in the system`);
      } else if (createError.message.includes('password') || createError.message.includes('Password')) {
        throw new Error(`Password for ${validatedData.email} doesn't meet requirements (at least 6 characters)`);
      } else {
        throw createError;
      }
    }

    if (!authData.user) {
      throw new Error(`No user returned for ${validatedData.email}`);
    }

    console.log(`User created with ID: ${authData.user.id}`);
    
    await createDriverRole(authData.user.id);
    const credData = await createDriverCredentials(authData.user.id, validatedData.driverId);

    console.log(`Driver credentials created:`, credData);
    console.log(`Successfully created driver account for ${validatedData.email} with Driver ID: ${validatedData.driverId}`);
    
    return authData;
    
  } catch (error) {
    console.error(`Error in createDriverAccount for ${email}:`, error);
    throw error;
  }
};
