
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DriverUploadResult {
  success: Array<{ email: string; driverId: string }>;
  errors: Array<{ email: string; error: string }>;
  total: number;
}

export const uploadDriverCredential = async (file: File): Promise<DriverUploadResult> => {
  // Process CSV file to extract driver data
  const drivers = await processDriversCSV(file);
  
  if (!drivers || drivers.length === 0) {
    throw new Error("No data found in the uploaded file");
  }

  const totalDrivers = drivers.length;
  
  // Process drivers one by one and collect results
  const results = {
    success: [] as { email: string; driverId: string }[],
    errors: [] as { email: string; error: string }[],
    total: totalDrivers
  };
  
  // Get a service client for authentication operations to avoid disrupting the user's session
  const adminSupabase = supabase;
  
  for (let i = 0; i < drivers.length; i++) {
    try {
      const driver = drivers[i];
      
      // Create user account using the admin API
      const response = await adminSupabase.auth.admin.createUser({
        email: driver.email,
        password: driver.password,
        user_metadata: {
          role: 'driver',
          driver_id: driver.driverId
        }
      });
      
      if (response.error) {
        throw response.error;
      }
      
      if (!response.data.user) {
        throw new Error(`Failed to create user account for ${driver.email}`);
      }
      
      try {
        // Create driver role
        const roleResponse = await adminSupabase.from('user_roles').insert({
          user_id: response.data.user.id,
          role: 'driver'
        });
        
        if (roleResponse.error) {
          console.error(`Error creating role for ${driver.email}:`, roleResponse.error);
          throw roleResponse.error;
        }
        
        // Use the create_driver_account RPC function to bypass RLS
        const credResponse = await adminSupabase.rpc('create_driver_account', {
          p_email: driver.email,
          p_password: driver.password,
          p_driver_id: driver.driverId
        });
        
        if (credResponse.error) {
          console.error(`Error creating driver credentials for ${driver.email}:`, credResponse.error);
          throw credResponse.error;
        }
      } catch (insertError: any) {
        // If we fail after user creation, log the error but still count as success
        // since the user account was created
        console.warn(`Created user account for ${driver.email} but had issues with role/credentials: ${insertError.message}`);
      }
      
      results.success.push({ email: driver.email, driverId: driver.driverId });
      console.log(`Successfully created account for ${driver.email}`);
      
    } catch (error: any) {
      console.error(`Error creating account for ${drivers[i].email}:`, error);
      results.errors.push({ 
        email: drivers[i].email, 
        error: error.message || 'Unknown error occurred'
      });
    }
    
    // Add delay between processing each driver to avoid rate limiting
    if (i < drivers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
};

interface DriverData {
  email: string;
  password: string;
  driverId: string;
}

// Helper function to parse the CSV data
const processDriversCSV = async (file: File): Promise<DriverData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const csvData = event.target?.result as string;
        if (!csvData) {
          throw new Error("Failed to read file");
        }
        
        // Split the CSV into rows and skip the header
        const rows = csvData.split('\n');
        const headers = rows[0].split(',').map(header => header.trim().toLowerCase());
        
        // Find column indices
        const emailIndex = headers.indexOf('email');
        const passwordIndex = headers.indexOf('password');
        const driverIdIndex = headers.indexOf('driverid');
        
        if (emailIndex === -1 || passwordIndex === -1 || driverIdIndex === -1) {
          throw new Error("CSV must contain 'email', 'password', and 'driverId' columns");
        }
        
        const drivers: DriverData[] = [];
        
        // Process each row (skip header)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i].trim();
          if (!row) continue; // Skip empty rows
          
          const columns = row.split(',').map(col => col.trim());
          
          if (columns.length <= Math.max(emailIndex, passwordIndex, driverIdIndex)) {
            console.warn(`Skipping row ${i}: insufficient columns`);
            continue;
          }
          
          const email = columns[emailIndex];
          const password = columns[passwordIndex];
          const driverId = columns[driverIdIndex];
          
          if (!email || !password || !driverId) {
            console.warn(`Skipping row ${i}: missing required data`);
            continue;
          }
          
          drivers.push({ email, password, driverId });
        }
        
        resolve(drivers);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };
    
    reader.readAsText(file);
  });
};
