import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";

interface DriverIncomeData {
  id: string;
  driver_id: string;
  driver_name: string | null;
  working_days: number;
  total_income: number;
  average_daily_income: number | null;
  month: string;
  year: number;
  created_at: string;
}

interface DriverIncomeReceiptProps {
  data: DriverIncomeData[];
  isLoading: boolean;
  driverName?: string;
  permitId?: string;
}

export const DriverIncomeReceipt = ({
  data,
  isLoading,
  driverName,
  permitId
}: DriverIncomeReceiptProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-8 text-center">
        <p className="text-gray-500">No income records found for your account.</p>
      </div>
    );
  }

  // Filter for 5 or 6 working days
  const filteredData = data.filter(row => row.working_days === 5 || row.working_days === 6);

  if (filteredData.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-8 text-center">
        <p className="text-gray-500">No records with 5 or 6 working days found.</p>
      </div>
    );
  }

  // Group by month/year
  const groupedData = filteredData.reduce((acc, item) => {
    const key = `${item.month} ${item.year}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, DriverIncomeData[]>);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end print:hidden">
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
      </div>
      {Object.entries(groupedData).map(([period, records]) => (
        <Card key={period} className="bg-white shadow-lg overflow-hidden">
          {/* Header with logo */}
          <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 border-b">
            <div className="flex items-center justify-center gap-3">
              <img 
                src="/lovable-uploads/aman-logo-footer.png" 
                alt="Aman Taxi" 
                className="h-12 object-contain"
              />
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-4">
            {records.map((record) => (
              <div key={record.id} className="space-y-4">
                {/* Driver Info */}
                <div className="space-y-2 border-b pb-4">
                  {permitId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Permit ID</span>
                      <span className="font-semibold">{permitId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Driver ID</span>
                    <span className="font-semibold">{record.driver_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Name</span>
                    <span className="font-semibold uppercase">{record.driver_name || driverName || '-'}</span>
                  </div>
                </div>

                {/* Period Title */}
                <div className="bg-amber-100 text-amber-800 text-center py-2 rounded font-semibold">
                  Driver Income Details ({period})
                </div>

                {/* Income Summary Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-amber-200">
                        <th className="text-left py-2 px-2 text-sm font-semibold text-gray-700">Working Days</th>
                        <th className="text-right py-2 px-2 text-sm font-semibold text-gray-700">Total Income</th>
                        <th className="text-right py-2 px-2 text-sm font-semibold text-gray-700">Avg Daily Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-2 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            record.working_days === 5 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {record.working_days} days
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-green-600">
                          {record.total_income.toFixed(2)} AED
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {record.average_daily_income?.toFixed(2) || '-'} AED
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Total Summary */}
                <div className="bg-gray-100 rounded-lg p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">Total Income</span>
                    <span className="text-2xl font-bold text-green-600">{record.total_income.toFixed(2)} AED</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
