import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface DriverIncomeTableProps {
  data: DriverIncomeData[];
  isLoading: boolean;
  onDataChange: () => void;
  selectedMonth: string;
  selectedYear: string;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  isAdmin: boolean;
}

const months = [
  "All", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = ["All", ...Array.from({ length: 5 }, (_, i) => String(currentYear - i))];

export const DriverIncomeTable = ({
  data,
  isLoading,
  onDataChange,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  isAdmin
}: DriverIncomeTableProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('driver_income')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Record deleted successfully");
      onDataChange();
    } catch (error: any) {
      console.error("Error deleting record:", error);
      toast.error("Failed to delete record");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete all displayed records?")) return;

    try {
      let query = supabase.from('driver_income').delete();

      if (selectedMonth !== "All") {
        query = query.eq('month', selectedMonth);
      }
      if (selectedYear !== "All") {
        query = query.eq('year', parseInt(selectedYear, 10));
      }

      // Need to add a condition to delete
      if (selectedMonth === "All" && selectedYear === "All") {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      }

      const { error } = await query;

      if (error) throw error;

      toast.success("All records deleted successfully");
      onDataChange();
    } catch (error: any) {
      console.error("Error deleting records:", error);
      toast.error("Failed to delete records");
    }
  };

  // Filter drivers with 5 or 6 working days
  const filteredData = data.filter(row => row.working_days === 5 || row.working_days === 6);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[120px]">
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isAdmin && filteredData.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete All
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-8 text-center">
          <p className="text-gray-500">No drivers with 5 or 6 working days found for the selected period.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-indigo-100 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-indigo-50">
                  <TableHead className="font-semibold">Driver ID</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold text-center">Working Days</TableHead>
                  <TableHead className="font-semibold text-right">Total Income</TableHead>
                  <TableHead className="font-semibold text-right">Avg Daily</TableHead>
                  <TableHead className="font-semibold">Month/Year</TableHead>
                  {isAdmin && <TableHead className="font-semibold text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{row.driver_id}</TableCell>
                    <TableCell>{row.driver_name || '-'}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.working_days === 5 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {row.working_days} days
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{row.total_income.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{row.average_daily_income?.toFixed(2) || '-'}</TableCell>
                    <TableCell>{row.month} {row.year}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
            Showing {filteredData.length} driver(s) with 5 or 6 working days
          </div>
        </div>
      )}
    </div>
  );
};
