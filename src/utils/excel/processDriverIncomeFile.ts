import * as XLSX from "xlsx";

export interface DriverIncomeRow {
  driver_id: string;
  driver_name: string | null;
  working_days: number;
  total_trips: number | null;
  total_income: number;
  shift: string | null;
  average_daily_income: number | null;
}

export interface SkippedRow {
  row: number;
  driver_id: string | null;
  reason: string;
}

export interface ProcessResult {
  data: DriverIncomeRow[];
  skipped: SkippedRow[];
}

export const processDriverIncomeFile = async (file: File): Promise<ProcessResult> => {
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
            if (lowerKey.includes('driver') && lowerKey.includes('id') || lowerKey === 'driverid' || lowerKey === 'driver_id') {
              normalized.driver_id = row[key];
            } else if (lowerKey.includes('driver') && lowerKey.includes('name') || lowerKey === 'name' || lowerKey === 'drivername' || lowerKey === 'driver_name') {
              normalized.driver_name = row[key];
            } else if (lowerKey.includes('wrk') || lowerKey.includes('working') && lowerKey.includes('day') || lowerKey === 'days' || lowerKey === 'wrkdays') {
              normalized.working_days = row[key];
            } else if (lowerKey === 'totaltrips' || lowerKey === 'total_trips' || lowerKey.includes('trips')) {
              normalized.total_trips = row[key];
            } else if (lowerKey === 'totalincome' || lowerKey === 'driverincome' || lowerKey === 'driver_income' || (lowerKey.includes('total') && lowerKey.includes('income')) || (lowerKey.includes('driver') && lowerKey.includes('income'))) {
              normalized.total_income = row[key];
            } else if (lowerKey === 'shift') {
              normalized.shift = row[key];
            } else {
              normalized[lowerKey] = row[key];
            }
          });
          
          return normalized;
        });
        
        // Check required columns
        const firstRow = normalizedData[0] || {};
        if (!('driver_id' in firstRow) || !('working_days' in firstRow) || !('total_income' in firstRow)) {
          throw new Error("Required columns missing. Please ensure the file contains: Driver ID, WrkDays, DriverIncome");
        }
        
        // Validate and clean data - filter out empty rows
        const cleanedData: DriverIncomeRow[] = [];
        const skippedRows: SkippedRow[] = [];
        
        for (let index = 0; index < normalizedData.length; index++) {
          const row = normalizedData[index];
          const rowNum = index + 2; // Excel row number (1-indexed + header row)
          const rawDriverId = row.driver_id !== undefined ? String(row.driver_id).trim() : null;
          
          // Skip empty rows or rows with missing required fields
          if (!row.driver_id || row.working_days === undefined || row.total_income === undefined) {
            const missingFields = [];
            if (!row.driver_id) missingFields.push('Driver ID');
            if (row.working_days === undefined) missingFields.push('WrkDays');
            if (row.total_income === undefined) missingFields.push('TotalIncome');
            skippedRows.push({
              row: rowNum,
              driver_id: rawDriverId,
              reason: `Missing required fields: ${missingFields.join(', ')}`
            });
            console.log(`Skipping row ${rowNum} (Driver ID: ${rawDriverId}): missing required fields - ${missingFields.join(', ')}`);
            continue;
          }
          
          const driver_id = String(row.driver_id).trim();
          
          // Skip if driver_id is empty after trimming
          if (!driver_id) {
            skippedRows.push({
              row: rowNum,
              driver_id: null,
              reason: 'Empty driver ID'
            });
            console.log(`Skipping row ${rowNum}: empty driver ID`);
            continue;
          }
          
          const driver_name = row.driver_name ? String(row.driver_name).trim() : null;
          const working_days = parseInt(String(row.working_days), 10);
          const total_trips = row.total_trips !== undefined ? parseInt(String(row.total_trips), 10) : null;
          const total_income = parseFloat(String(row.total_income).replace(/[^0-9.-]/g, ''));
          const shift = row.shift ? String(row.shift).trim() : null;
          
          // Skip invalid numeric data
          if (isNaN(working_days) || working_days < 0) {
            skippedRows.push({
              row: rowNum,
              driver_id: driver_id,
              reason: `Invalid WrkDays value: "${row.working_days}"`
            });
            console.log(`Skipping row ${rowNum} (Driver ID: ${driver_id}): invalid WrkDays - "${row.working_days}"`);
            continue;
          }
          
          if (isNaN(total_income)) {
            skippedRows.push({
              row: rowNum,
              driver_id: driver_id,
              reason: `Invalid TotalIncome value: "${row.total_income}"`
            });
            console.log(`Skipping row ${rowNum} (Driver ID: ${driver_id}): invalid TotalIncome - "${row.total_income}"`);
            continue;
          }
          
          // Calculate average if working days > 0
          let average_daily_income: number | null = null;
          if (working_days > 0) {
            average_daily_income = Math.round((total_income / working_days) * 100) / 100;
          }
          
          cleanedData.push({
            driver_id,
            driver_name,
            working_days,
            total_trips: total_trips !== null && !isNaN(total_trips) ? total_trips : null,
            total_income,
            shift,
            average_daily_income
          });
        }
        
        if (cleanedData.length === 0) {
          throw new Error("No valid data rows found in the file");
        }
        
        console.log("Parsed driver income data:", cleanedData);
        console.log("Skipped rows:", skippedRows);
        resolve({ data: cleanedData, skipped: skippedRows });
      } catch (error) {
        console.error("Error processing driver income file:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
