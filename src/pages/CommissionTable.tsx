
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { commissionData } from "@/constants/calculator";
import { filterCommissionData } from "@/utils/commissionUtils";
import CommissionSingleWithBasicTable from "@/components/commission/CommissionSingleWithBasicTable";
import CommissionSingleWithoutBasicTable from "@/components/commission/CommissionSingleWithoutBasicTable";
import CommissionDoubleShiftTable from "@/components/commission/CommissionDoubleShiftTable";
import { FloatingCalculator } from "@/components/calculator/FloatingCalculator";

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
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-4 sm:p-6 relative overflow-x-auto">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-10"
        onClick={handleClose}
      >
        <X className="h-6 w-6 text-muted-foreground hover:text-foreground" />
      </Button>
      
      <Button
        variant="outline"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background hover:bg-accent text-primary border-border"
        onClick={handleBackToHome}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Home</span>
      </Button>
      
      <div className="max-w-6xl mx-auto pt-16 space-y-6">
        <CommissionSingleWithBasicTable data={singleShiftBasic} />
        <CommissionSingleWithoutBasicTable data={singleShiftWithoutBasic} />
        <CommissionDoubleShiftTable data={doubleShift} />
      </div>
      <FloatingCalculator />
    </div>
  );
};

export default CommissionTable;
