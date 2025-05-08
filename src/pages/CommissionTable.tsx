
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { commissionData } from "@/constants/calculator";
import { filterCommissionData } from "@/utils/commissionUtils";
import CommissionSingleWithBasicTable from "@/components/commission/CommissionSingleWithBasicTable";
import CommissionSingleWithoutBasicTable from "@/components/commission/CommissionSingleWithoutBasicTable";
import CommissionDoubleShiftTable from "@/components/commission/CommissionDoubleShiftTable";

const CommissionTable = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate("/home");
  };

  const handleBackToHome = () => {
    navigate("/home");
  };

  const singleShiftBasic = filterCommissionData(commissionData, "Single Shift", "With Basic");
  const singleShiftWithoutBasic = filterCommissionData(commissionData, "Single Shift", "With Out Basic");
  const doubleShift = filterCommissionData(commissionData, "Double Shift", "With Basic");

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6 relative overflow-x-auto">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-10"
        onClick={handleClose}
      >
        <X className="h-6 w-6 text-gray-600 hover:text-gray-900" />
      </Button>
      
      <Button
        variant="outline"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200"
        onClick={handleBackToHome}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Button>
      
      <div className="max-w-6xl mx-auto space-y-6">
        <CommissionSingleWithBasicTable data={singleShiftBasic} />
        <CommissionSingleWithoutBasicTable data={singleShiftWithoutBasic} />
        <CommissionDoubleShiftTable data={doubleShift} />
      </div>
    </div>
  );
};

export default CommissionTable;
