import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { commissionData } from "@/constants/calculator";
import type { NextTierInfo } from "@/types/calculator";
import { CalculatorHeader } from "@/components/calculator/CalculatorHeader";
import { AdminActionButtons } from "@/components/admin/AdminActionButtons";
import { CalculatorContainer } from "@/components/calculator/CalculatorContainer";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [commissionType, setCommissionType] = useState("");
  const [totalIncome, setTotalIncome] = useState<number | undefined>(undefined);
  const [workingDays, setWorkingDays] = useState<number | undefined>(undefined);
  const [averageDailyIncome, setAverageDailyIncome] = useState<number | undefined>(undefined);
  const [commissionPercentage, setCommissionPercentage] = useState<number | undefined>(undefined);
  const [nextTierInfo, setNextTierInfo] = useState<NextTierInfo[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      console.log("Dashboard loaded with user role:", user.role);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (totalIncome !== undefined && workingDays !== undefined && workingDays > 0 && month !== "" && shiftType !== "" && commissionType !== "") {
      const income = totalIncome / workingDays;
      setAverageDailyIncome(income);

      const matchedTier = commissionData.find(
        (item) =>
          item.shiftType === shiftType &&
          item.commissionType === commissionType &&
          income >= item.from &&
          income <= item.to
      );

      if (matchedTier) {
        setCommissionPercentage(matchedTier.percentage);
      } else {
        const aboveTier = commissionData.find(
          (item) =>
            item.shiftType === shiftType &&
            item.commissionType === commissionType &&
            item.to === Infinity &&
            income >= item.from
        );
        if (aboveTier) {
          setCommissionPercentage(aboveTier.percentage);
        } else {
          setCommissionPercentage(0);
          toast({
            title: "No commission tier found",
            description: "Could not determine commission percentage based on the inputs.",
          });
        }
      }

      const currentTier = commissionData.find(
        (item) =>
          item.shiftType === shiftType &&
          item.commissionType === commissionType &&
          income >= item.from &&
          income <= item.to
      ) || commissionData.find(
        (item) =>
          item.shiftType === shiftType &&
          item.commissionType === commissionType &&
          item.to === Infinity &&
          income >= item.from
      );

      const currentIndex = currentTier ? commissionData.indexOf(currentTier) : -1;
      let tiers: NextTierInfo[] = [];
      if (currentIndex !== -1) {
        let nextIndex = currentIndex + 1;
        while (nextIndex < commissionData.length) {
          const nextTier = commissionData[nextIndex];
          if (nextTier.shiftType === shiftType && nextTier.commissionType === commissionType) {
            tiers.push({
              percentage: nextTier.percentage,
              amountNeeded: Math.max(0, (nextTier.from - income) * workingDays),
            });
          }
          nextIndex++;
        }
      }
      setNextTierInfo(tiers);

    } else {
      setAverageDailyIncome(undefined);
      setCommissionPercentage(undefined);
      setNextTierInfo([]);
    }
  }, [totalIncome, workingDays, shiftType, commissionType, month]);

  const handleReset = () => {
    setMonth("");
    setShiftType("");
    setCommissionType("");
    setTotalIncome(undefined);
    setWorkingDays(undefined);
    setAverageDailyIncome(undefined);
    setCommissionPercentage(undefined);
    setNextTierInfo([]);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 flex flex-col justify-start items-center p-2 md:p-6">
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex flex-col gap-4 md:gap-6">
          <CalculatorHeader userRole={user?.role} onLogout={handleLogout} />
          <AdminActionButtons />
          <CalculatorContainer
            month={month}
            shiftType={shiftType}
            commissionType={commissionType}
            totalIncome={totalIncome}
            workingDays={workingDays}
            averageDailyIncome={averageDailyIncome}
            commissionPercentage={commissionPercentage}
            nextTierInfo={nextTierInfo}
            onReset={handleReset}
            onMonthChange={setMonth}
            onShiftTypeChange={setShiftType}
            onCommissionTypeChange={setCommissionType}
            onTotalIncomeChange={setTotalIncome}
            onWorkingDaysChange={setWorkingDays}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
