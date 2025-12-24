import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      // Delete all records that match current filter (5 or 6 working days)
      const idsToDelete = filteredData.map(row => row.id);
      
      if (idsToDelete.length === 0) {
        toast.error("No records to delete");
        return;
      }

      const { error } = await supabase
        .from('driver_income')
        .delete()
        .in('id', idsToDelete);

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
      {/* Delete all button */}
      {isAdmin && filteredData.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete All ({filteredData.length})
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground">No drivers with 5 or 6 working days found.</p>
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
            Showing {filteredData.length} driver(s) with 5 or 6 working days
          </div>
        </div>
      )}
    </div>
  );
};
