
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { commissionData, months } from "@/constants/calculator";
import type { NextTierInfo } from "@/types/calculator";
import { CalculatorHeader } from "@/components/calculator/CalculatorHeader";
import { CalculatorContainer } from "@/components/calculator/CalculatorContainer";
import { UserProfile } from "@/components/calculator/UserProfile";

// Get current month in format matching months array (e.g., "25-Dec")
const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthStr = `${year}-${monthNames[now.getMonth()]}`;
  return months.includes(currentMonthStr) ? currentMonthStr : "";
};

const Dashboard = () => {
  const { user, logout } = useAuth();
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
    if (!user) {
      navigate("/login");
    } else {
      console.log("Dashboard loaded with user role:", user.role);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (totalIncome !== undefined && workingDays !== undefined && workingDays > 0 && month !== "" && shiftType !== "" && commissionType !== "") {
      // Calculate average daily income with proper precision
      const income = Number((totalIncome / workingDays).toFixed(2));
      console.log("Average daily income calculated:", income);
      setAverageDailyIncome(income);

      // Filter data based on the user selected shift type and commission type
      let filteredData = commissionData.filter(
        (item) => item.shiftType === shiftType && item.commissionType === commissionType
      );
      
      // Sort filtered data by the 'from' value to ensure proper tier comparison
      const sortedData = [...filteredData].sort((a, b) => a.from - b.from);
      console.log("Sorted commission data:", sortedData);
      
      // Find matching tier based on average daily income
      let matchedTier = null;
      for (const tier of sortedData) {
        if (income >= tier.from && income <= tier.to) {
          matchedTier = tier;
          break;
        }
      }

      if (matchedTier) {
        console.log("Matched tier found:", matchedTier);
        setCommissionPercentage(matchedTier.percentage);
      } else {
        // Check for the highest tier (when income is above the highest defined range)
        const highestTier = sortedData
          .filter(item => income >= item.from)
          .sort((a, b) => b.from - a.from)[0];
          
        if (highestTier) {
          console.log("Highest applicable tier found:", highestTier);
          setCommissionPercentage(highestTier.percentage);
        } else {
          setCommissionPercentage(0);
          toast({
            title: "No commission tier found",
            description: "Could not determine commission percentage based on the inputs.",
          });
        }
      }

      // Calculate next tiers with precise values
      let tiers: NextTierInfo[] = [];
      
      if (sortedData.length > 0) {
        // Find all tiers higher than current income
        tiers = sortedData
          .filter(tier => tier.from > income)
          .map(tier => ({
            percentage: tier.percentage,
            amountNeeded: Math.max(0, Number(((tier.from - income) * workingDays).toFixed(2))),
          }))
          .sort((a, b) => a.amountNeeded - b.amountNeeded);
      }
      
      console.log("Next tier info:", tiers);
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
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 flex flex-col justify-start items-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col gap-4 sm:gap-6">
          <CalculatorHeader userRole={user?.role} onLogout={handleLogout} />
          
          {user && (
            <UserProfile 
              email={user.email} 
              username={user.username} 
              role={user.role}
            />
          )}
          
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
