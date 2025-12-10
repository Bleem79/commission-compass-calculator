
import { BarChart, Percent } from 'lucide-react';
import { NextTierList } from './NextTierList';
import type { NextTierInfo } from '@/types/calculator';

interface CalculatorResultsProps {
  averageDailyIncome?: number;
  commissionPercentage?: number;
  nextTierInfo: NextTierInfo[];
}

export const CalculatorResults = ({
  averageDailyIncome,
  commissionPercentage,
  nextTierInfo
}: CalculatorResultsProps) => {
  return (
    <div className="mt-4 space-y-2">
      <div className="text-lg font-semibold">
        {averageDailyIncome !== undefined && (
          <div className="flex items-center space-x-2 text-pink-600">
            <BarChart className="h-5 w-5" />
            <span>Average Daily Income: {averageDailyIncome.toFixed(2)}</span>
          </div>
        )}
        {commissionPercentage !== undefined && (
          <div className="flex items-center space-x-2 text-emerald-700">
            <Percent className="h-5 w-5" />
            <span>Commission Percentage: <span className="font-bold">{commissionPercentage}%</span></span>
          </div>
        )}
      </div>
      
      <NextTierList tiers={nextTierInfo} />
    </div>
  );
};
