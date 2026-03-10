import { commissionData } from "@/constants/calculator";
import { filterCommissionData } from "@/utils/commissionUtils";
import CommissionSingleWithBasicTable from "@/components/commission/CommissionSingleWithBasicTable";
import CommissionSingleWithoutBasicTable from "@/components/commission/CommissionSingleWithoutBasicTable";
import CommissionDoubleShiftTable from "@/components/commission/CommissionDoubleShiftTable";
import { FloatingCalculator } from "@/components/calculator/FloatingCalculator";
import { PageLayout } from "@/components/shared/PageLayout";

const CommissionTable = () => {
  const singleShiftBasic = filterCommissionData(commissionData, "Single Shift", "With Basic");
  const singleShiftWithoutBasic = filterCommissionData(commissionData, "Single Shift", "With Out Basic");
  const doubleShift = filterCommissionData(commissionData, "Double Shift", "With Basic");

  return (
    <PageLayout gradient="from-white via-indigo-50 to-purple-100">
      <div className="space-y-6">
        <CommissionSingleWithBasicTable data={singleShiftBasic} />
        <CommissionSingleWithoutBasicTable data={singleShiftWithoutBasic} />
        <CommissionDoubleShiftTable data={doubleShift} />
      </div>
      <FloatingCalculator />
    </PageLayout>
  );
};

export default CommissionTable;
