import * as XLSX from "xlsx";

export interface DriverIncomeRow {
  driver_id: string;
  driver_name: string | null;
  working_days: number;
  total_income: number;
  average_daily_income: number | null;
}

export const processDriverIncomeFile = async (file: File): Promise<DriverIncomeRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet);
        
        console.log("Raw driver income data:", rawData);
        
        if (!Array.isArray(rawData) || rawData.length === 0) {
          throw new Error("No data found in the file or invalid format");
        }
        
        // Normalize column names to handle case insensitivity and common variations
        const normalizedData = rawData.map((row: any) => {
          const normalized: Record<string, any> = {};
          
          Object.keys(row).forEach(key => {
            const lowerKey = String(key).toLowerCase().trim().replace(/\s+/g, '_');
            
            // Map variations of column names
            if (lowerKey.includes('driver') && lowerKey.includes('id')) {
              normalized.driver_id = row[key];
            } else if (lowerKey.includes('driver') && lowerKey.includes('name') || lowerKey === 'name') {
              normalized.driver_name = row[key];
            } else if (lowerKey.includes('working') && lowerKey.includes('day') || lowerKey === 'days') {
              normalized.working_days = row[key];
            } else if (lowerKey.includes('total') && lowerKey.includes('income') || lowerKey === 'income' || lowerKey === 'total') {
              normalized.total_income = row[key];
            } else if (lowerKey.includes('average') || lowerKey.includes('daily') || lowerKey === 'avg') {
              normalized.average_daily_income = row[key];
            } else {
              normalized[lowerKey] = row[key];
            }
          });
          
          return normalized;
        });
        
        // Check required columns
        const firstRow = normalizedData[0] || {};
        if (!('driver_id' in firstRow) || !('working_days' in firstRow) || !('total_income' in firstRow)) {
          throw new Error("Required columns missing. Please ensure the file contains: Driver ID, Working Days, Total Income");
        }
        
        // Validate and clean data
        const cleanedData: DriverIncomeRow[] = normalizedData.map((row: any, index) => {
          if (!row.driver_id || row.working_days === undefined || row.total_income === undefined) {
            throw new Error(`Row ${index + 2} is missing required fields (Driver ID, Working Days, or Total Income)`);
          }
          
          const driver_id = String(row.driver_id).trim();
          const driver_name = row.driver_name ? String(row.driver_name).trim() : null;
          const working_days = parseInt(String(row.working_days), 10);
          const total_income = parseFloat(String(row.total_income).replace(/[^0-9.-]/g, ''));
          
          if (isNaN(working_days) || working_days < 0) {
            throw new Error(`Invalid working days in row ${index + 2}`);
          }
          
          if (isNaN(total_income)) {
            throw new Error(`Invalid total income in row ${index + 2}`);
          }
          
          // Calculate average if not provided
          let average_daily_income: number | null = null;
          if (row.average_daily_income !== undefined) {
            average_daily_income = parseFloat(String(row.average_daily_income).replace(/[^0-9.-]/g, ''));
          } else if (working_days > 0) {
            average_daily_income = Math.round((total_income / working_days) * 100) / 100;
          }
          
          return {
            driver_id,
            driver_name,
            working_days,
            total_income,
            average_daily_income
          };
        });
        
        console.log("Parsed driver income data:", cleanedData);
        resolve(cleanedData);
      } catch (error) {
        console.error("Error processing driver income file:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
