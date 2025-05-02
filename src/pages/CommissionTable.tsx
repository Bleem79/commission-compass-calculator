
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { commissionData } from "@/constants/calculator";

const CommissionTable = () => {
  const navigate = useNavigate();

  const getBackgroundColor = (percentage: number) => {
    switch (percentage) {
      case 38:
      case 35:
        return "bg-purple-100";
      case 32:
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

  const filterData = (shiftType: string, commissionType?: string) => {
    return commissionData
      .filter(item => {
        if (commissionType) {
          return item.shiftType === shiftType && item.commissionType === commissionType;
        }
        return item.shiftType === shiftType;
      })
      .sort((a, b) => a.from - b.from);
  };

  const renderSingleShiftBasicTable = (data: typeof commissionData) => (
    <Card className="w-full rounded-lg shadow-lg bg-white/90 backdrop-blur-sm border border-indigo-100 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-indigo-800 text-center">
          Single Shift With Basic - Commission Percentage Table
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-indigo-50">
              <TableHead className="font-semibold text-indigo-900">From</TableHead>
              <TableHead className="font-semibold text-indigo-900">To</TableHead>
              <TableHead className="font-semibold text-indigo-900">Commission Percentage</TableHead>
              <TableHead className="font-semibold text-indigo-900">Fixed Incentive</TableHead>
              <TableHead className="font-semibold text-indigo-900">Basic</TableHead>
              <TableHead className="font-semibold text-indigo-900">HRA</TableHead>
              <TableHead className="font-semibold text-indigo-900">Total Fixed Salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index} className={getBackgroundColor(row.percentage)}>
                <TableCell>{row.from}</TableCell>
                <TableCell>{row.to === Infinity ? 'Above' : row.to}</TableCell>
                <TableCell>{row.percentage}%</TableCell>
                <TableCell>{row.fixedIncentive !== null ? row.fixedIncentive : '-'}</TableCell>
                <TableCell>{row.basic}</TableCell>
                <TableCell>{row.hra !== null ? row.hra : '-'}</TableCell>
                <TableCell>{row.totalFixedSalary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderSingleShiftWithoutBasicTable = (data: typeof commissionData) => (
    <Card className="w-full rounded-lg shadow-lg bg-white/90 backdrop-blur-sm border border-indigo-100 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-indigo-800 text-center">
          Single Shift With Out Basic - Commission Percentage Table
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-indigo-50">
              <TableHead className="font-semibold text-indigo-900">From</TableHead>
              <TableHead className="font-semibold text-indigo-900">To</TableHead>
              <TableHead className="font-semibold text-indigo-900">Commission Percentage</TableHead>
              <TableHead className="font-semibold text-indigo-900">Fixed Incentive</TableHead>
              <TableHead className="font-semibold text-indigo-900">No. of Trips</TableHead>
              <TableHead className="font-semibold text-indigo-900">Slabs</TableHead>
              <TableHead className="font-semibold text-indigo-900">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index} className={getBackgroundColor(row.percentage)}>
                <TableCell>{row.from}</TableCell>
                <TableCell>{row.to === Infinity ? 'Above' : row.to}</TableCell>
                <TableCell>{row.percentage}%</TableCell>
                <TableCell>{row.fixedIncentive}</TableCell>
                <TableCell>{row.noOfTrips || '-'}</TableCell>
                <TableCell>{row.slabs || '-'}</TableCell>
                <TableCell>{row.amount !== null ? row.amount : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderDoubleShiftTable = (data: typeof commissionData) => (
    <Card className="w-full rounded-lg shadow-lg bg-white/90 backdrop-blur-sm border border-indigo-100 mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-indigo-800 text-center">
          Double Shift - Commission Percentage Table
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-indigo-50">
              <TableHead className="font-semibold text-indigo-900">From</TableHead>
              <TableHead className="font-semibold text-indigo-900">To</TableHead>
              <TableHead className="font-semibold text-indigo-900">Commission Percentage</TableHead>
              <TableHead className="font-semibold text-indigo-900">Incentive</TableHead>
              <TableHead className="font-semibold text-indigo-900">Basic</TableHead>
              <TableHead className="font-semibold text-indigo-900">HRA</TableHead>
              <TableHead className="font-semibold text-indigo-900">Total Fixed Salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index} className={getBackgroundColor(row.percentage)}>
                <TableCell>{row.from}</TableCell>
                <TableCell>{row.to === Infinity ? 'Above' : row.to}</TableCell>
                <TableCell>{row.percentage}%</TableCell>
                <TableCell>{row.incentive !== null ? row.incentive : '-'}</TableCell>
                <TableCell>{row.basic}</TableCell>
                <TableCell>{row.hra !== null ? row.hra : '-'}</TableCell>
                <TableCell>{row.totalFixedSalary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const singleShiftBasic = filterData("Single Shift", "With Basic");
  const singleShiftWithoutBasic = filterData("Single Shift", "With Out Basic");
  const doubleShift = filterData("Double Shift", "With Basic");

  const handleClose = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6 relative overflow-x-auto">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-10"
        onClick={handleClose}
      >
        <X className="h-6 w-6 text-gray-600 hover:text-gray-900" />
      </Button>
      <div className="max-w-6xl mx-auto space-y-6">
        {renderSingleShiftBasicTable(singleShiftBasic)}
        {renderSingleShiftWithoutBasicTable(singleShiftWithoutBasic)}
        {renderDoubleShiftTable(doubleShift)}
      </div>
    </div>
  );
};

export default CommissionTable;
