
import { Button } from "@/components/ui/button";
import { RefreshCw } from 'lucide-react';

export const CalculatorActions = ({ onReset }: { onReset: () => void }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4">
      <Button
        variant="secondary"
        onClick={onReset}
        className="flex items-center justify-center gap-2 bg-pink-50 hover:bg-pink-100 text-rose-600 border border-pink-200"
      >
        <RefreshCw className="h-4 w-4" />
        Reset
      </Button>
      <p className="text-red-600 text-sm font-medium">
        Actual working days will be calculated at the end of the month
      </p>
    </div>
  );
};
