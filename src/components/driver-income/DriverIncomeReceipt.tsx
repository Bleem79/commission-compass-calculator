import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react";

interface DriverIncomeData {
  id: string;
  driver_id: string;
  driver_name: string | null;
  working_days: number;
  total_trips: number | null;
  total_income: number;
  shift: string | null;
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
  reportHeading?: string;
}

export const DriverIncomeReceipt = ({
  data,
  isLoading,
  driverName,
  permitId,
  reportHeading
}: DriverIncomeReceiptProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-8 text-center">
        <p className="text-gray-500">
          No income records found for Driver ID {permitId || "your account"}.
        </p>
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
    <div className="space-y-6 print-receipt">
      <div className="flex justify-end print:hidden">
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Print Receipt
        </Button>
      </div>
      {Object.entries(groupedData).map(([period, records]) => (
        <Card key={period} className="bg-white shadow-lg overflow-hidden card">
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
            {/* Custom Report Heading */}
            {reportHeading && (
              <div className="report-heading bg-gradient-to-r from-amber-500 to-amber-600 text-white text-center py-3 rounded-lg font-bold text-lg mb-4">
                {reportHeading}
              </div>
            )}
            
            {records.map((record) => (
              <div key={record.id} className="space-y-4 border-b border-gray-200 pb-6 last:border-b-0">
                {/* Driver Info Section */}
                <div className="driver-info bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-500 text-sm">Driver ID</span>
                      <p className="font-bold text-lg text-primary">{record.driver_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-sm">Shift</span>
                      <p className="font-semibold text-gray-800">{record.shift || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">Name</span>
                    <p className="font-semibold text-gray-800 uppercase">{record.driver_name || driverName || '-'}</p>
                  </div>
                </div>

                {/* Income Details Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-amber-50 border-b-2 border-amber-200">
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Working Days</th>
                        <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Total Trips</th>
                        <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Driver Income</th>
                        <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Avg Daily</th>
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
                        <td className="py-3 px-2 text-center font-medium text-gray-700">
                          {record.total_trips ?? '-'}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-green-600 text-lg">
                          {record.total_income.toFixed(2)} AED
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-gray-600">
                          {record.average_daily_income?.toFixed(2) || '-'} AED
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
