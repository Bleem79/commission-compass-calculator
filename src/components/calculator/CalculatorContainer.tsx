
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Percent, HelpCircle } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { CalculatorForm } from "./CalculatorForm";
import { CalculatorActions } from "./CalculatorActions";
import { CalculatorResults } from "./CalculatorResults";
import { useIsMobile } from "@/hooks/use-mobile";
import type { NextTierInfo } from "@/types/calculator";

interface CalculatorContainerProps {
  month: string;
  shiftType: string;
  commissionType: string;
  totalIncome: number | undefined;
  workingDays: number | undefined;
  averageDailyIncome: number | undefined;
  commissionPercentage: number | undefined;
  nextTierInfo: NextTierInfo[];
  onReset: () => void;
  onMonthChange: (value: string) => void;
  onShiftTypeChange: (value: string) => void;
  onCommissionTypeChange: (value: string) => void;
  onTotalIncomeChange: (value: number | undefined) => void;
  onWorkingDaysChange: (value: number | undefined) => void;
}

export const CalculatorContainer = ({
  month,
  shiftType,
  commissionType,
  totalIncome,
  workingDays,
  averageDailyIncome,
  commissionPercentage,
  nextTierInfo,
  onReset,
  onMonthChange,
  onShiftTypeChange,
  onCommissionTypeChange,
  onTotalIncomeChange,
  onWorkingDaysChange,
}: CalculatorContainerProps) => {
  const isMobile = useIsMobile();

  return (
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
          onMonthChange={onMonthChange}
          onShiftTypeChange={onShiftTypeChange}
          onCommissionTypeChange={onCommissionTypeChange}
          onTotalIncomeChange={onTotalIncomeChange}
          onWorkingDaysChange={onWorkingDaysChange}
        />
        
        <CalculatorActions onReset={onReset} />
        
        <Separator className="my-2 md:my-4" />
        
        <CalculatorResults
          averageDailyIncome={averageDailyIncome}
          commissionPercentage={commissionPercentage}
          nextTierInfo={nextTierInfo}
        />
      </CardContent>
    </Card>
  );
};
