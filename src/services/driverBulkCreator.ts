
import { DriverData, DriverCreationResult } from "@/types/driver";
import { createDriverAccount } from "./driverAccountCreator";

export const bulkCreateDriverAccounts = async (drivers: DriverData[]): Promise<DriverCreationResult> => {
  console.log(`Starting bulk creation of ${drivers.length} driver accounts`);
  
  const results: DriverCreationResult = {
    success: [],
    errors: []
  };

  for (const driver of drivers) {
    try {
      await createDriverAccount(driver.password, driver.driverId);
      results.success.push({ driverId: driver.driverId });
      console.log(`Successfully created account for Driver ID: ${driver.driverId}`);
    } catch (error: any) {
      console.error(`Error creating account for ${driver.driverId}:`, error);
      results.errors.push({ 
        driverId: driver.driverId, 
        error: error.message || 'Unknown error occurred'
      });
    }

    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Bulk creation completed. Success: ${results.success.length}, Errors: ${results.errors.length}`);
  return results;
};
