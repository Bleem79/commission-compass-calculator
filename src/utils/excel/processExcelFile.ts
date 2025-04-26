import * as XLSX from "xlsx";

export const processExcelFile = async (file: File): Promise<Array<{ email: string, password: string, driverId: string }>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet);
        
        console.log("Raw Excel data:", rawData);
        
        if (!Array.isArray(rawData) || rawData.length === 0) {
          throw new Error("No data found in the Excel file or invalid format");
        }
        
        // Normalize column names to handle case insensitivity and common variations
        const normalizedData = rawData.map((row: any) => {
          const normalized: Record<string, any> = {};
          
          // Process each key in the row
          Object.keys(row).forEach(key => {
            const lowerKey = String(key).toLowerCase().trim();
            
            // Map variations of column names to our standardized keys
            if (lowerKey === 'email' || lowerKey === 'email address' || lowerKey === 'emailaddress') {
              normalized.email = row[key];
            } else if (lowerKey === 'password' || lowerKey === 'pass' || lowerKey === 'pwd') {
              normalized.password = row[key];
            } else if (lowerKey === 'driverid' || lowerKey === 'driver id' || lowerKey === 'driver_id' || lowerKey === 'id') {
              normalized.driverId = row[key];
            } else {
              // Keep other columns as is
              normalized[key] = row[key];
            }
          });
          
          return normalized;
        });
        
        // Check if we have the required columns after normalization
        const firstRow = normalizedData[0] || {};
        if (!('email' in firstRow) || !('password' in firstRow) || !('driverId' in firstRow)) {
          throw new Error("Required columns missing. Please ensure the Excel file contains columns for email, password, and driverId");
        }
        
        // Validate and clean data
        const cleanedData = normalizedData.map((row: any, index) => {
          // Check for required fields
          if (!row.email || !row.password || !row.driverId) {
            throw new Error(`Row ${index + 1} is missing required fields (email, password, or driverId)`);
          }
          
          // Clean and validate each field
          const email = String(row.email).trim().toLowerCase();
          const password = String(row.password).trim();
          const driverId = String(row.driverId).trim();
          
          // Validate email format
          if (!email.includes('@')) {
            throw new Error(`Invalid email format in row ${index + 1}: ${email}`);
          }
          
          // Validate password length
          if (password.length < 6) {
            throw new Error(`Password too short in row ${index + 1} (minimum 6 characters)`);
          }
          
          // Validate driverId is not empty
          if (driverId.length === 0) {
            throw new Error(`Empty driver ID in row ${index + 1}`);
          }
          
          return { email, password, driverId };
        });
        
        console.log("Parsed and validated Excel data:", cleanedData);
        resolve(cleanedData);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
