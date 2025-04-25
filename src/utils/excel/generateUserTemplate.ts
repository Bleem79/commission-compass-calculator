
import * as XLSX from 'xlsx';

export const generateUserTemplate = () => {
  // Define the template headers and sample data
  const headers = ['email', 'password', 'driverId'];
  const sampleData = [
    ['driver1@example.com', 'Password123!', 'DRV001'],
    ['driver2@example.com', 'Password123!', 'DRV002'],
  ];

  // Create a new workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Add column validations and formatting
  ws['!cols'] = [
    { wch: 25 }, // email column width
    { wch: 15 }, // password column width
    { wch: 10 }, // driverId column width
  ];

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Driver Template');

  // Generate and return the template file
  const template = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return template;
};
