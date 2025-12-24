import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, Upload, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DriverIncomeUploader } from "@/components/driver-income/DriverIncomeUploader";
import { DriverIncomeTable } from "@/components/driver-income/DriverIncomeTable";
import { DriverIncomeReceipt } from "@/components/driver-income/DriverIncomeReceipt";

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

const DriverIncomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [incomeData, setIncomeData] = useState<DriverIncomeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [reportHeading, setReportHeading] = useState("");
  const [driverInfo, setDriverInfo] = useState<{ driverId: string; permitId?: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch driver info for non-admin users
  useEffect(() => {
    const fetchDriverInfo = async () => {
      if (!isAdmin && user?.id) {
        const { data } = await supabase
          .from('driver_credentials')
          .select('driver_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data) {
          setDriverInfo({ driverId: data.driver_id });
        }
      }
    };
    fetchDriverInfo();
  }, [isAdmin, user?.id]);

  // Fetch report heading from settings
  useEffect(() => {
    const fetchReportHeading = async () => {
      const { data } = await supabase
        .from('driver_income_settings')
        .select('report_heading')
        .limit(1)
        .maybeSingle();
      
      if (data?.report_heading) {
        setReportHeading(data.report_heading);
      }
    };
    if (isAuthenticated) {
      fetchReportHeading();
    }
  }, [isAuthenticated]);

  const fetchIncomeData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_income')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching income data:", error);
        return;
      }

      setIncomeData(data || []);
    } catch (err) {
      console.error("Unexpected error fetching income data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchIncomeData();
    }
  }, [fetchIncomeData, isAuthenticated]);

  const handleClose = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-indigo-50/50 to-purple-100/50 p-4 sm:p-6 relative overflow-x-auto">
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
        <span className="hidden sm:inline">Back to Home</span>
      </Button>

      <div className="max-w-6xl mx-auto pt-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-primary flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            {isAdmin ? "Driver Income Management" : "My Income Details"}
          </h1>
          
          {isAdmin && user?.id && (
            <Button
              variant="outline"
              onClick={() => setShowUploader(!showUploader)}
              className="flex items-center gap-2 bg-background hover:bg-accent text-primary border-border"
            >
              <Upload className="h-4 w-4" />
              {showUploader ? 'Hide Uploader' : 'Import Excel/CSV'}
            </Button>
          )}
        </div>

        {/* Upload Section - Admin Only */}
        {isAdmin && showUploader && user?.id && (
          <div className="mb-6 bg-card rounded-lg border border-border p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Import Driver Income Data</h2>
            <DriverIncomeUploader
              userId={user.id}
              onUploadSuccess={(heading: string) => {
                setReportHeading(heading);
                fetchIncomeData();
                setShowUploader(false);
              }}
              reportHeading={reportHeading}
              onHeadingChange={setReportHeading}
            />
          </div>
        )}

        {/* Show Receipt View for Drivers, Table View for Admin */}
        {isAdmin ? (
          <DriverIncomeTable
            data={incomeData}
            isLoading={isLoading}
            onDataChange={fetchIncomeData}
            isAdmin={isAdmin}
            reportHeading={reportHeading}
          />
        ) : (
          <DriverIncomeReceipt
            data={incomeData}
            isLoading={isLoading}
            driverName={user?.username}
            permitId={driverInfo?.driverId}
            reportHeading={reportHeading}
          />
        )}
      </div>
    </div>
  );
};

export default DriverIncomePage;
