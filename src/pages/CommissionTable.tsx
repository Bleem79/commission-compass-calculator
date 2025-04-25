
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { commissionData } from "@/constants/calculator";

const CommissionTable = () => {
  const getBackgroundColor = (percentage: number) => {
    switch (percentage) {
      case 35:
        return "bg-purple-100";
      case 30:
        return "bg-pink-100";
      case 25:
        return "bg-orange-100";
      case 20:
        return "bg-yellow-100";
      case 15:
        return "bg-blue-100";
      case 10:
        return "bg-green-100";
      case 5:
        return "bg-gray-100";
      default:
        return "";
    }
  };

  const filterAndSortData = () => {
    return commissionData
      .filter(item => item.shiftType === "Single Shift" && item.commissionType === "With Basic")
      .sort((a, b) => a.from - b.from);
  };

  const filteredData = filterAndSortData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full rounded-lg shadow-lg bg-white/90 backdrop-blur-sm border border-indigo-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-indigo-800">
              Commission Percentage Table
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-indigo-50">
                  <TableHead className="font-semibold text-indigo-900">From</TableHead>
                  <TableHead className="font-semibold text-indigo-900">To</TableHead>
                  <TableHead className="font-semibold text-indigo-900">Commission Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, index) => (
                  <TableRow 
                    key={index} 
                    className={getBackgroundColor(row.percentage)}
                  >
                    <TableCell>{row.from}</TableCell>
                    <TableCell>{row.to === Infinity ? 'Above' : row.to}</TableCell>
                    <TableCell>{row.percentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CommissionTable;
