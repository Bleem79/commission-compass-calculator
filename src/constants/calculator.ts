export const months = [
  "25-Jan", "25-Feb", "25-Mar", "25-Apr", "25-May", "25-Jun",
  "25-Jul", "25-Aug", "25-Sep", "25-Oct", "25-Nov", "25-Dec"
];

export const commissionData = [
  // Single Shift With Basic
  { shiftType: "Single Shift", commissionType: "With Basic", from: 0, to: 199.99, percentage: 0, fixedIncentive: null, basic: 300, hra: null, totalFixedSalary: 300 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 200, to: 224.99, percentage: 5, fixedIncentive: null, basic: 300, hra: null, totalFixedSalary: 300 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 225, to: 249.99, percentage: 10, fixedIncentive: 200, basic: 300, hra: 500, totalFixedSalary: 800 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 250, to: 269.99, percentage: 15, fixedIncentive: 200, basic: 300, hra: 500, totalFixedSalary: 800 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 270, to: 299.99, percentage: 20, fixedIncentive: 400, basic: 300, hra: 500, totalFixedSalary: 800 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 300, to: 339.99, percentage: 25, fixedIncentive: 600, basic: 300, hra: 500, totalFixedSalary: 800 },
  { shiftType: "Single Shift", commissionType: "With Basic", from: 340, to: Infinity, percentage: 35, fixedIncentive: 1000, basic: 300, hra: 500, totalFixedSalary: 800 },
  
  // Single Shift Without Basic
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 0, to: 174.99, percentage: 5, fixedIncentive: 0, noOfTrips: null, slabs: null, amount: null },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 175, to: 209.99, percentage: 10, fixedIncentive: 0, noOfTrips: null, slabs: null, amount: null },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 210, to: 224.99, percentage: 15, fixedIncentive: 0, noOfTrips: null, slabs: null, amount: null },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 225, to: 239.9, percentage: 20, fixedIncentive: 100, noOfTrips: null, slabs: null, amount: null },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 240, to: 274.99, percentage: 25, fixedIncentive: 200, noOfTrips: "18-20.99", slabs: "25%", amount: 100 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 275, to: 299.99, percentage: 30, fixedIncentive: 300, noOfTrips: "24-24.99", slabs: "30%", amount: 200 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 300, to: 324.99, percentage: 32, fixedIncentive: 400, noOfTrips: "25&Above", slabs: "35%", amount: 300 },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 325, to: 384.99, percentage: 35, fixedIncentive: 400, noOfTrips: null, slabs: null, amount: null },
  { shiftType: "Single Shift", commissionType: "With Out Basic", from: 385, to: Infinity, percentage: 38, fixedIncentive: 500, noOfTrips: null, slabs: null, amount: null },
  
  // Double Shift
  { shiftType: "Double Shift", commissionType: "With Basic", from: 0, to: 149.99, percentage: 0, incentive: null, basic: 300, hra: null, totalFixedSalary: 300 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 150, to: 169.99, percentage: 5, incentive: null, basic: 300, hra: 500, totalFixedSalary: 800 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 170, to: 189.99, percentage: 10, incentive: 150, basic: 300, hra: 500, totalFixedSalary: 800 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 190, to: 204.99, percentage: 15, incentive: 150, basic: 300, hra: 500, totalFixedSalary: 800 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 205, to: 224.99, percentage: 20, incentive: 300, basic: 300, hra: 500, totalFixedSalary: 800 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 225, to: 254.99, percentage: 25, incentive: 450, basic: 300, hra: 500, totalFixedSalary: 800 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 255, to: 284.99, percentage: 30, incentive: 600, basic: 300, hra: 500, totalFixedSalary: 800 },
  { shiftType: "Double Shift", commissionType: "With Basic", from: 285, to: Infinity, percentage: 35, incentive: 750, basic: 300, hra: 500, totalFixedSalary: 800 },
];
