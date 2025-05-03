
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, BarChart, Wallet } from 'lucide-react';
import { months } from "@/constants/calculator";

interface CalculatorFormProps {
  month: string;
  shiftType: string;
  commissionType: string;
  totalIncome?: number;
  workingDays?: number;
  onMonthChange: (value: string) => void;
  onShiftTypeChange: (value: string) => void;
  onCommissionTypeChange: (value: string) => void;
  onTotalIncomeChange: (value: number) => void;
  onWorkingDaysChange: (value: number) => void;
}

export const CalculatorForm = ({
  month,
  shiftType,
  commissionType,
  totalIncome,
  workingDays,
  onMonthChange,
  onShiftTypeChange,
  onCommissionTypeChange,
  onTotalIncomeChange,
  onWorkingDaysChange
}: CalculatorFormProps) => {
  return (
    <div className="grid gap-4">
      <div>
        <Label htmlFor="month">
          <Calendar className="mr-2 h-4 w-4 inline-block" />
          Select Current Month
        </Label>
        <Select onValueChange={onMonthChange} value={month}>
          <SelectTrigger className="w-full bg-input">
            <SelectValue placeholder="Select current month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="shiftType">
          <Calendar className="mr-2 h-4 w-4 inline-block" />
          Select Shift Type
        </Label>
        <Select onValueChange={onShiftTypeChange} value={shiftType}>
          <SelectTrigger className="w-full bg-input">
            <SelectValue placeholder="Select shift type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Single Shift">Single Shift</SelectItem>
            <SelectItem value="Double Shift">Double Shift</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="commissionType">
          <Wallet className="mr-2 h-4 w-4 inline-block" />
          Select Commission Type
        </Label>
        <Select onValueChange={onCommissionTypeChange} value={commissionType}>
          <SelectTrigger className="w-full bg-input">
            <SelectValue placeholder="Select commission type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="With Basic">With Basic</SelectItem>
            <SelectItem value="With Out Basic">Without Basic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="totalIncome">
          <BarChart className="mr-2 h-4 w-4 inline-block" />
          Driver Income
        </Label>
        <Input
          type="number"
          id="totalIncome"
          placeholder="Enter total income"
          className="bg-input"
          value={totalIncome !== undefined ? totalIncome.toString() : ''}
          onChange={(e) => onTotalIncomeChange(Number(e.target.value))}
        />
      </div>

      <div>
        <Label htmlFor="workingDays">
          <Calendar className="mr-2 h-4 w-4 inline-block" />
          Working Days
        </Label>
        <Input
          type="number"
          id="workingDays"
          placeholder="Enter working days"
          className="bg-input"
          value={workingDays !== undefined ? workingDays.toString() : ''}
          onChange={(e) => onWorkingDaysChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
};
