
// Utility function to get background color based on percentage
export const getBackgroundColor = (percentage: number) => {
  switch (percentage) {
    case 38:
    case 35:
      return "bg-purple-100";
    case 32:
    case 30:
      return "bg-pink-100";
    case 25:
      return "bg-orange-100";
    case 20:
      return "bg-yellow-100";
    case 15:
      return "bg-blue-100";
    case 10:
      return "bg-green-100";
    case 5:
      return "bg-gray-100";
    default:
      return "";
  }
};

// Utility function to filter data based on shift type and commission type
export const filterCommissionData = (array: any[], shiftType: string, commissionType?: string) => {
  return array
    .filter(item => {
      if (commissionType) {
        return item.shiftType === shiftType && item.commissionType === commissionType;
      }
      return item.shiftType === shiftType;
    })
    .sort((a, b) => a.from - b.from);
};
