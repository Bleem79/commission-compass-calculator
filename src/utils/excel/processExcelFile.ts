
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
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        console.log("Parsed Excel data:", jsonData);
        
        resolve(jsonData as Array<{ email: string, password: string | number, driverId: string }>);
      } catch (error) {
        console.error("Error processing Excel file:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
