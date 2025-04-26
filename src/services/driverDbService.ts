
import { supabase } from "@/integrations/supabase/client";

export const checkExistingDriver = async (driverId: string) => {
  const { data: existingDrivers, error: driverCheckError } = await supabase
    .from('driver_credentials')
    .select('driver_id')
    .eq('driver_id', driverId);
  
  if (driverCheckError) {
    console.error(`Error checking existing driver: ${driverCheckError.message}`);
    throw driverCheckError;
  }
  
  return existingDrivers;
};

export const createDriverRole = async (userId: string) => {
  const { error: roleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: 'driver'
    });
    
  if (roleError) {
    console.error(`Role assignment error for user ${userId}:`, roleError);
    if (roleError.message.includes('violates row-level security') || 
        roleError.message.includes('permission denied')) {
      throw roleError;
    }
  }
};

export const createDriverCredentials = async (userId: string, driverId: string) => {
  const { data: credData, error: credError } = await supabase
    .from('driver_credentials')
    .insert({
      user_id: userId,
      driver_id: driverId
    })
    .select();
  
  if (credError) {
    console.error(`Driver credentials insertion error:`, credError);
    throw credError;
  }

  return credData;
};
