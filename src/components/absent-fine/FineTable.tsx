import React from "react";
import { Loader2, AlertCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface FineRecord {
  id: string;
  fine_no: string;
  driver_id: string;
  vehicle_number: string;
  fine_type: string;
  driver_reason: string | null;
  start_date: string;
  end_date: string;
  days: number;
  total_amount: number;
  timestamp: string;
  entered_by: string;
}

interface FineTableProps {
  fines: FineRecord[];
  totalCount: number;
  isLoading: boolean;
  deletingId: string | null;
  onDelete: (id: string) => void;
}

export const FineTable = ({ fines, totalCount, isLoading, deletingId, onDelete }: FineTableProps) => (
  <Card className="bg-white/10 backdrop-blur-md border-white/20">
    <CardContent className="p-0">
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      ) : fines.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-white/60">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p>{totalCount === 0 ? "No fine records found" : "No matching records"}</p>
          <p className="text-sm">{totalCount === 0 ? "Upload a CSV file to get started" : "Try adjusting your search or filters"}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/20 hover:bg-white/5">
                <TableHead className="text-white/80">Fine No.</TableHead>
                <TableHead className="text-white/80">Driver ID</TableHead>
                <TableHead className="text-white/80">Vehicle</TableHead>
                <TableHead className="text-white/80">Fine Type</TableHead>
                <TableHead className="text-white/80">Reason</TableHead>
                <TableHead className="text-white/80">Start</TableHead>
                <TableHead className="text-white/80">End</TableHead>
                <TableHead className="text-white/80 text-right">Days</TableHead>
                <TableHead className="text-white/80 text-right">Amount</TableHead>
                <TableHead className="text-white/80">Entered By</TableHead>
                <TableHead className="text-white/80 text-center w-16">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fines.slice(0, 100).map((fine) => (
                <TableRow key={fine.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white font-medium">{fine.fine_no}</TableCell>
                  <TableCell className="text-white">{fine.driver_id}</TableCell>
                  <TableCell className="text-white">{fine.vehicle_number}</TableCell>
                  <TableCell className="text-white text-sm">{fine.fine_type}</TableCell>
                  <TableCell className="text-white/80 text-sm">{fine.driver_reason || "-"}</TableCell>
                  <TableCell className="text-white/80 text-sm">{fine.start_date}</TableCell>
                  <TableCell className="text-white/80 text-sm">{fine.end_date}</TableCell>
                  <TableCell className="text-white text-right">{fine.days}</TableCell>
                  <TableCell className="text-white text-right font-medium">{fine.total_amount}</TableCell>
                  <TableCell className="text-white/80 text-sm">{fine.entered_by}</TableCell>
                  <TableCell className="text-center">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          disabled={deletingId === fine.id}
                        >
                          {deletingId === fine.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Fine Record?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete fine <strong>{fine.fine_no}</strong> for driver <strong>{fine.driver_id}</strong>. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(fine.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {fines.length > 100 && (
            <p className="text-center text-white/60 text-sm py-4">
              Showing 100 of {fines.length} records
            </p>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);
