import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { commissionData, months } from "@/constants/calculator";
import type { NextTierInfo } from "@/types/calculator";
import { CalculatorContainer } from "@/components/calculator/CalculatorContainer";
import { UserProfile } from "@/components/calculator/UserProfile";
import { FloatingCalculator } from "@/components/calculator/FloatingCalculator";
import { PageLayout } from "@/components/shared/PageLayout";
import { Calculator } from "lucide-react";

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthStr = `${year}-${monthNames[now.getMonth()]}`;
  return months.includes(currentMonthStr) ? currentMonthStr : "";
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState(getCurrentMonth());
  const [shiftType, setShiftType] = useState("");
  const [commissionType, setCommissionType] = useState("");
  const [totalIncome, setTotalIncome] = useState<number | undefined>(undefined);
  const [workingDays, setWorkingDays] = useState<number | undefined>(undefined);
  const [averageDailyIncome, setAverageDailyIncome] = useState<number | undefined>(undefined);
  const [commissionPercentage, setCommissionPercentage] = useState<number | undefined>(undefined);
  const [nextTierInfo, setNextTierInfo] = useState<NextTierInfo[]>([]);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    if (shiftType === "Double Shift" && commissionType !== "With Basic") {
      setCommissionType("With Basic");
    }
  }, [shiftType, commissionType]);

  useEffect(() => {
    if (totalIncome !== undefined && workingDays !== undefined && workingDays > 0 && month !== "" && shiftType !== "" && commissionType !== "") {
      const income = Number((totalIncome / workingDays).toFixed(2));
      setAverageDailyIncome(income);

      let filteredData = commissionData.filter(
        (item) => item.shiftType === shiftType && item.commissionType === commissionType
      );
      const sortedData = [...filteredData].sort((a, b) => a.from - b.from);
      
      let matchedTier = null;
      for (const tier of sortedData) {
        if (income >= tier.from && income <= tier.to) {
          matchedTier = tier;
          break;
        }
      }

      if (matchedTier) {
        setCommissionPercentage(matchedTier.percentage);
      } else {
        const highestTier = sortedData
          .filter(item => income >= item.from)
          .sort((a, b) => b.from - a.from)[0];
          
        if (highestTier) {
          setCommissionPercentage(highestTier.percentage);
        } else {
          setCommissionPercentage(0);
          toast({
            title: "No commission tier found",
            description: "Could not determine commission percentage based on the inputs.",
          });
        }
      }

      let tiers: NextTierInfo[] = [];
      if (sortedData.length > 0) {
        tiers = sortedData
          .filter(tier => tier.from > income)
          .map(tier => ({
            percentage: tier.percentage,
            amountNeeded: Math.max(0, Number(((tier.from - income) * workingDays).toFixed(2))),
          }))
          .sort((a, b) => a.amountNeeded - b.amountNeeded);
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

  return (
    <PageLayout
      title="Commission Calculator"
      icon={<Calculator className="h-6 w-6" />}
      maxWidth="4xl"
      gradient="from-background via-indigo-50 to-purple-100"
    >
      {user && (
        <UserProfile 
          email={user.email} 
          username={user.username} 
          role={user.role}
        />
      )}
      
      <div className="mt-4">
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
      <FloatingCalculator />
    </PageLayout>
  );
};

export default Dashboard;
