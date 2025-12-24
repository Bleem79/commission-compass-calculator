
export const processCSVFile = async (file: File): Promise<Array<{ password: string, driverId: string }>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n');
        
        // Get headers and normalize them
        const headers = rows[0].split(',').map(header => 
          header.trim().toLowerCase()
            .replace(/['"]+/g, '') // Remove quotes
            .replace(/\r$/, '') // Remove carriage return
        );
        
        // Validate required columns - only driverId and password needed
        const requiredColumns = ['password', 'driverid'];
        const missingColumns = requiredColumns.filter(col => 
          !headers.some(header => header === col || 
            header === col + 's' || // Handle plural
            header.includes(col) || // Handle variations
            col.includes(header))
        );
        
        if (missingColumns.length > 0) {
          throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }
        
        // Find column indexes
        const passwordIndex = headers.findIndex(h => h.includes('password'));
        const driverIdIndex = headers.findIndex(h => 
          h.includes('driverid') || h.includes('driver_id') || h.includes('driver id')
        );
        
        // Process data rows
        const data = rows.slice(1)
          .filter(row => row.trim()) // Skip empty rows
          .map((row, index) => {
            const columns = row.split(',').map(col => 
              col.trim().replace(/['"]+/g, '') // Remove quotes and trim
            );
            
            // Validate row data
            if (!columns[passwordIndex] || !columns[driverIdIndex]) {
              throw new Error(`Row ${index + 2} is missing required fields`);
            }
            
            const password = columns[passwordIndex];
            const driverId = columns[driverIdIndex];
            
            // Basic validation
            if (password.length < 6) {
              throw new Error(`Password too short in row ${index + 2} (minimum 6 characters)`);
            }
            
            if (driverId.length === 0) {
              throw new Error(`Empty driver ID in row ${index + 2}`);
            }
            
            return { password, driverId };
          });
        
        console.log("Successfully parsed CSV data:", data.length, "rows");
        resolve(data);
      } catch (error) {
        console.error("Error processing CSV file:", error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error("Error reading CSV file:", error);
      reject(error);
    };
    
    reader.readAsText(file);
  });
};

export const validateDriverData = (data: any) => {
  if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
    throw new Error('Invalid email format');
  }
  
  if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  
  if (!data.driverId || typeof data.driverId !== 'string') {
    throw new Error('Driver ID is required');
  }
  
  return {
    email: data.email.trim().toLowerCase(),
    password: data.password,
    driverId: data.driverId.trim()
  };
};
