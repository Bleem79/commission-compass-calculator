
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Percent, HelpCircle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CalculatorHeader } from "@/components/calculator/CalculatorHeader";
import { UserProfile } from "@/components/calculator/UserProfile";
import { CalculatorForm } from "@/components/calculator/CalculatorForm";
import { CalculatorActions } from "@/components/calculator/CalculatorActions";
import { CalculatorResults } from "@/components/calculator/CalculatorResults";
import { commissionData } from "@/constants/calculator";
import type { NextTierInfo } from "@/types/calculator";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const isMobile = useIsMobile();
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
  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  const [openFuelAlertDialog, setOpenFuelAlertDialog] = useState(false);
  const [openHotspotAlertDialog, setOpenHotspotAlertDialog] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      // Debug the user role when dashboard loads
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
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="mb-4"
              onClick={() => navigate('/commission-table')}
            >
              View Commission Table
            </Button>
          </div>
          <UserProfile email={user?.email} username={user?.username} role={user?.role} />
          
          <Card className="w-full rounded-lg shadow-lg bg-white/90 backdrop-blur-sm border border-indigo-100">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 pb-2">
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-indigo-800">
                Commission Percentage Calculator
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Percent className="h-5 w-5 md:h-6 md:w-6 text-indigo-500" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size={isMobile ? "sm" : "icon"}>
                        <HelpCircle className="h-4 w-4 text-purple-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side={isMobile ? "bottom" : "right"} className="bg-secondary text-secondary-foreground">
                      Calculate your potential commission based on your monthly income.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 md:space-y-6 p-3 md:p-6">
              <CalculatorForm
                month={month}
                shiftType={shiftType}
                commissionType={commissionType}
                totalIncome={totalIncome}
                workingDays={workingDays}
                onMonthChange={setMonth}
                onShiftTypeChange={setShiftType}
                onCommissionTypeChange={setCommissionType}
                onTotalIncomeChange={setTotalIncome}
                onWorkingDaysChange={setWorkingDays}
              />
              
              <CalculatorActions onReset={handleReset} />
              
              <Separator className="my-2 md:my-4" />
              
              <CalculatorResults
                averageDailyIncome={averageDailyIncome}
                commissionPercentage={commissionPercentage}
                nextTierInfo={nextTierInfo}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
