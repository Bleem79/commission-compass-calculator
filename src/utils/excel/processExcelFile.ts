
import * as XLSX from "xlsx";

export const processExcelFile = async (file: File): Promise<Array<{ email: string, password: string | number, driverId: string }>> => {
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
        
        // Validate and clean data
        const cleanedData = rawData.map((row: any, index) => {
          if (!row.email || !row.password || !row.driverId) {
            throw new Error(`Row ${index + 1} is missing required fields (email, password, or driverId)`);
          }
          
          // Clean and validate each field
          const email = String(row.email).trim();
          const password = String(row.password);
          const driverId = String(row.driverId).trim();
          
          if (!email.includes('@')) {
            throw new Error(`Invalid email format in row ${index + 1}: ${email}`);
          }
          
          if (password.length < 6) {
            throw new Error(`Password too short in row ${index + 1} (minimum 6 characters)`);
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
