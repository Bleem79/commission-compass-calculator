
import { supabase } from "@/integrations/supabase/client";
import { validateDriverData } from "@/utils/driverValidation";
import { checkExistingDriver, createDriverRole, createDriverCredentials } from "./driverDbService";

export const createDriverAccount = async (email: string, password: string, driverId: string) => {
  console.log(`Attempting to create driver account for ${email} with Driver ID: ${driverId}`);

  try {
    const { emailStr, passwordStr, driverIdStr } = validateDriverData(email, password, driverId);
    
    const existingDrivers = await checkExistingDriver(driverIdStr);
    
    if (existingDrivers && existingDrivers.length > 0) {
      throw new Error(`Driver with ID ${driverIdStr} already exists`);
    }
    
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
    
    await createDriverRole(authData.user.id);
    const credData = await createDriverCredentials(authData.user.id, driverIdStr);

    console.log(`Driver credentials created:`, credData);
    console.log(`Successfully created driver account for ${emailStr} with Driver ID: ${driverIdStr}`);
    
    return authData;
    
  } catch (error) {
    console.error(`Error in createDriverAccount for ${email}:`, error);
    throw error;
  }
};
