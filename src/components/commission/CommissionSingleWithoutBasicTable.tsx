
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import TableHeaderComponent from "./TableHeader";
import { getBackgroundColor } from "@/utils/commissionUtils";

interface CommissionSingleWithoutBasicTableProps {
  data: any[];
}

const CommissionSingleWithoutBasicTable = ({ data }: CommissionSingleWithoutBasicTableProps) => {
  return (
    <Card className="w-full rounded-lg shadow-lg bg-white/90 backdrop-blur-sm border border-indigo-100 mb-6">
      <TableHeaderComponent title="Single Shift With Out Basic - Commission Percentage Table" />
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
};

export default CommissionSingleWithoutBasicTable;
