import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Ban, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AbsentFineData {
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

const DriverAbsentFineViewPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [fines, setFines] = useState<AbsentFineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch driver ID from credentials
  useEffect(() => {
    const fetchDriverId = async () => {
      if (!user?.id) return;

      const { data: authUser } = await supabase.auth.getUser();
      const actualUserId = authUser?.user?.id || user?.id;
      const actualEmail = (authUser?.user?.email || user?.email || "").toLowerCase();

      // If user logged in with driver temp email
      const driverIdFromEmail = actualEmail.endsWith("@driver.temp")
        ? actualEmail.split("@")[0].trim()
        : null;

      if (driverIdFromEmail) {
        setDriverId(driverIdFromEmail);
        return;
      }

      // Fallback: lookup by user_id
      const { data } = await supabase
        .from("driver_credentials")
        .select("driver_id")
        .eq("user_id", actualUserId)
        .maybeSingle();

      if (data?.driver_id) {
        setDriverId(data.driver_id);
      }
    };

    fetchDriverId();
  }, [user?.id, user?.email]);

  // Fetch fines for this driver
  const fetchFines = useCallback(async () => {
    if (!driverId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("driver_absent_fines")
        .select("*")
        .eq("driver_id", driverId)
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("Error fetching fines:", error);
        return;
      }

      setFines(data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    if (driverId) {
      fetchFines();
    }
  }, [driverId, fetchFines]);

  const handleClose = () => {
    navigate("/driver-portal");
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const totalFineAmount = fines.reduce((sum, fine) => sum + Number(fine.total_amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-50/50 to-red-100/50 p-4 sm:p-6">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-10"
        onClick={handleClose}
      >
        <X className="h-6 w-6 text-muted-foreground hover:text-foreground" />
      </Button>
      
      <Button
        variant="outline"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background hover:bg-accent text-primary border-border"
        onClick={handleClose}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Portal</span>
      </Button>

      <div className="max-w-4xl mx-auto pt-16">
        <div className="flex items-center gap-3 mb-6">
          <Ban className="h-8 w-8 text-orange-600" />
          <h1 className="text-2xl font-bold text-foreground">My Absent Fines</h1>
        </div>

        {/* Summary Card */}
        {driverId && (
          <div className="bg-card rounded-lg border border-border p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Driver ID</p>
                <p className="text-lg font-semibold">{driverId}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Fines</p>
                <p className="text-2xl font-bold text-destructive">AED {totalFineAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fines Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading fines...</p>
            </div>
          ) : !driverId ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Unable to identify driver account.</p>
            </div>
          ) : fines.length === 0 ? (
            <div className="p-8 text-center">
              <Ban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">No Fines Found</h2>
              <p className="text-muted-foreground">You have no absent fines recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fine No.</TableHead>
                    <TableHead>Fine Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fines.map((fine) => (
                    <TableRow key={fine.id}>
                      <TableCell className="font-medium">{fine.fine_no}</TableCell>
                      <TableCell>{fine.fine_type}</TableCell>
                      <TableCell>{formatDate(fine.start_date)}</TableCell>
                      <TableCell>{fine.days}</TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        AED {Number(fine.total_amount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverAbsentFineViewPage;
