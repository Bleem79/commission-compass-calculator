import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Loader2, Search, X, Download, Users, TrendingUp, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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

interface DriverIncomeTableProps {
  data: DriverIncomeData[];
  isLoading: boolean;
  onDataChange: () => void;
  isAdmin: boolean;
  reportHeading: string;
}

export const DriverIncomeTable = ({
  data,
  isLoading,
  onDataChange,
  isAdmin,
  reportHeading
}: DriverIncomeTableProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL driver income records? This will clear all data so fresh data can be imported.")) return;

    setIsDeletingAll(true);
    try {
      const { error } = await supabase
        .from('driver_income')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      toast.success("All driver income records deleted successfully");
      onDataChange();
    } catch (error: any) {
      console.error("Error deleting records:", error);
      toast.error("Failed to delete records");
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Apply search filter
  const filteredData = data.filter(row => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const driverId = row.driver_id.toLowerCase();
    const driverName = (row.driver_name || '').toLowerCase();
    return driverId.includes(query) || driverName.includes(query);
  });

  // Calculate summary statistics
  const stats = useMemo(() => {
    const uniqueDrivers = new Set(data.map(row => row.driver_id)).size;
    const totalTrips = data.reduce((sum, row) => sum + (row.total_trips || 0), 0);
    const totalIncome = data.reduce((sum, row) => sum + row.total_income, 0);
    return { uniqueDrivers, totalTrips, totalIncome };
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Summary Statistics Cards */}
      {data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Drivers</p>
                <p className="text-2xl font-bold text-blue-500">{stats.uniqueDrivers.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Car className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold text-green-500">{stats.totalTrips.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Driver Income</p>
                <p className="text-2xl font-bold text-purple-500">AED {stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Delete All controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Driver ID or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Export to Excel button */}
          {data.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const exportData = filteredData.map(row => ({
                  "Driver ID": row.driver_id,
                  "Driver Name": row.driver_name || "",
                  "Working Days": row.working_days,
                  "Total Trips": row.total_trips ?? "",
                  "Driver Income": row.total_income,
                  "Shift": row.shift || "",
                  "Month": row.month,
                  "Year": row.year,
                }));
                const worksheet = XLSX.utils.json_to_sheet(exportData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Driver Income");
                XLSX.writeFile(workbook, `Driver_Income_${new Date().toISOString().split('T')[0]}.xlsx`);
                toast.success(`Exported ${filteredData.length} records to Excel`);
              }}
              className="text-primary border-primary/30 hover:bg-primary/10"
            >
              <Download className="h-4 w-4 mr-1" />
              Export Excel
            </Button>
          )}

          {/* Delete All button */}
          {isAdmin && data.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              {isDeletingAll ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              {isDeletingAll ? "Deleting..." : `Delete All (${data.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? `No drivers found matching "${searchQuery}"` : "No driver income data found."}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Driver ID</TableHead>
                  <TableHead className="font-semibold">Driver Name</TableHead>
                  <TableHead className="font-semibold text-center">WrkDays</TableHead>
                  <TableHead className="font-semibold text-center">Total Trips</TableHead>
                  <TableHead className="font-semibold text-right">Driver Income</TableHead>
                  <TableHead className="font-semibold">Shift</TableHead>
                  {isAdmin && <TableHead className="font-semibold text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{row.driver_id}</TableCell>
                    <TableCell>{row.driver_name || '-'}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.working_days === 5 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {row.working_days}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{row.total_trips ?? '-'}</TableCell>
                    <TableCell className="text-right">{row.total_income.toFixed(2)}</TableCell>
                    <TableCell>{row.shift || '-'}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
          <div className="px-4 py-3 bg-muted/30 border-t border-border text-sm text-muted-foreground">
            Showing {filteredData.length} of {data.length} driver record(s)
            {searchQuery && ` (filtered by "${searchQuery}")`}
          </div>
        </div>
      )}
    </div>
  );
};