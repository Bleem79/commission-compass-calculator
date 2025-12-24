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
  const { isAuthenticated, isAdmin, user, session } = useAuth();
  const [incomeData, setIncomeData] = useState<DriverIncomeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [reportHeading, setReportHeading] = useState("");
  const [driverInfo, setDriverInfo] = useState<{ driverId: string; permitId?: string } | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ sessionUserId: string; contextUserId: string; email: string; linkedVia: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Fetch/link driver info for non-admin users - always use the real authenticated Supabase user
  useEffect(() => {
    const fetchDriverInfo = async () => {
      if (!isAuthenticated || isAdmin) return;

      // Get the current authed user directly from Supabase to avoid stale context
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const actualUserId = authUser?.id || user?.id;
      const actualEmail = (authUser?.email || user?.email || "").toLowerCase();

      if (!actualUserId) return;

      setDebugInfo({
        sessionUserId: authUser?.id || "none",
        contextUserId: user?.id || "none",
        email: actualEmail,
        linkedVia: "pending...",
      });

      // If user logged in with a driver temp email, use RPC to ensure credentials are linked
      const driverIdFromEmail = actualEmail.endsWith("@driver.temp")
        ? actualEmail.split("@")[0].trim()
        : null;

      if (driverIdFromEmail) {
        const { data: credentialRows, error: credError } = await supabase.rpc(
          "get_driver_credentials",
          {
            p_driver_id: driverIdFromEmail,
            p_user_id: actualUserId,
          }
        );

        const credentials = credentialRows && credentialRows.length > 0 ? credentialRows[0] : null;

        if (!credError && credentials?.driver_id) {
          setDriverInfo({ driverId: credentials.driver_id });
          setDebugInfo((prev) => (prev ? { ...prev, linkedVia: "RPC (get_driver_credentials)" } : null));
          return;
        }
      }

      // Fallback: lookup by user_id
      const { data } = await supabase
        .from("driver_credentials")
        .select("driver_id")
        .eq("user_id", actualUserId)
        .maybeSingle();

      if (data?.driver_id) {
        setDriverInfo({ driverId: data.driver_id });
        setDebugInfo((prev) => (prev ? { ...prev, linkedVia: "Direct query (user_id)" } : null));
      } else {
        setDebugInfo((prev) => (prev ? { ...prev, linkedVia: "NOT FOUND" } : null));
      }
    };

    fetchDriverInfo();
  }, [isAuthenticated, isAdmin, user?.id, user?.email]);

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
      const query = supabase
        .from('driver_income')
        .select('*')
        .order('created_at', { ascending: false });

      // Note: drivers are automatically restricted by RLS to only see their own income rows.
      // We intentionally do NOT add a manual driver_id filter here.

      const { data, error } = await query;

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
  }, [isAdmin, driverInfo?.driverId]);

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

        {/* Debug Panel for Drivers */}
        {!isAdmin && debugInfo && (
          <div className="mb-4 rounded-lg border border-border bg-card p-4 text-sm text-foreground">
            <h2 className="font-semibold">Debug Info</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Session User ID:</span>
              <span className="font-mono text-xs">{debugInfo.sessionUserId}</span>

              <span className="text-muted-foreground">Context User ID:</span>
              <span className="font-mono text-xs">{debugInfo.contextUserId}</span>

              <span className="text-muted-foreground">Email:</span>
              <span className="font-mono text-xs">{debugInfo.email}</span>

              <span className="text-muted-foreground">Detected Driver ID:</span>
              <span className="font-semibold">{driverInfo?.driverId || "NOT DETECTED"}</span>

              <span className="text-muted-foreground">Linked Via:</span>
              <span>{debugInfo.linkedVia}</span>

              <span className="text-muted-foreground">Records Found:</span>
              <span className="font-semibold">{incomeData.length}</span>

              {incomeData.length > 0 && (
                <>
                  <span className="text-muted-foreground">Last Upload:</span>
                  <span>{new Date(incomeData[0].created_at).toLocaleString()}</span>
                </>
              )}
            </div>
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
