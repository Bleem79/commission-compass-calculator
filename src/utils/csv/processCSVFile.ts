
export const processCSVFile = async (file: File): Promise<Array<{ password: string, driverId: string, status: string }>> => {
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
        
        // Validate required columns - driverId and password are required, status is optional
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
        const statusIndex = headers.findIndex(h => h.includes('status'));
        
        // Process data rows
        const data = rows.slice(1)
          .filter(row => row.trim()) // Skip empty rows
          .map((row, index) => {
            const columns = row.split(',').map(col => 
              col.trim().replace(/['"]+/g, '').replace(/\r$/, '') // Remove quotes, trim, and remove carriage return
            );
            
            // Validate row data
            if (!columns[passwordIndex] || !columns[driverIdIndex]) {
              throw new Error(`Row ${index + 2} is missing required fields`);
            }
            
            const password = columns[passwordIndex];
            const driverId = columns[driverIdIndex];
            // Default to 'enabled' if status column not provided or empty
            let status = statusIndex >= 0 && columns[statusIndex] ? columns[statusIndex].toLowerCase() : 'enabled';
            
            // Validate status value
            if (status !== 'enabled' && status !== 'disabled') {
              status = 'enabled'; // Default to enabled if invalid value
            }
            
            // Basic validation
            if (password.length < 6) {
              throw new Error(`Password too short in row ${index + 2} (minimum 6 characters)`);
            }
            
            if (driverId.length === 0) {
              throw new Error(`Empty driver ID in row ${index + 2}`);
            }
            
            return { password, driverId, status };
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
