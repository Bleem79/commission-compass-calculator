import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DriverIncomeUploader } from "@/components/driver-income/DriverIncomeUploader";
import { DriverIncomeTable } from "@/components/driver-income/DriverIncomeTable";
import { FloatingCalculator } from "@/components/calculator/FloatingCalculator";
import { DriverIncomeReceipt } from "@/components/driver-income/DriverIncomeReceipt";
import { PageLayout } from "@/components/shared/PageLayout";

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
  const { isAuthenticated, isAdmin, user, canAccessAdminPages } = useAuth();
  const [incomeData, setIncomeData] = useState<DriverIncomeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [reportHeading, setReportHeading] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [driverInfo, setDriverInfo] = useState<{ driverId: string; permitId?: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  // Fetch/link driver info for non-admin users
  useEffect(() => {
    const fetchDriverInfo = async () => {
      if (!isAuthenticated || isAdmin || canAccessAdminPages) return;
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const actualUserId = authUser?.id || user?.id;
      const actualEmail = (authUser?.email || user?.email || "").toLowerCase();
      if (!actualUserId) return;

      const driverIdFromEmail = actualEmail.endsWith("@driver.temp") ? actualEmail.split("@")[0].trim() : null;
      if (driverIdFromEmail) {
        const { data: credentialRows, error: credError } = await supabase.rpc("get_driver_credentials", { p_driver_id: driverIdFromEmail, p_user_id: actualUserId });
        const credentials = credentialRows && credentialRows.length > 0 ? credentialRows[0] : null;
        if (!credError && credentials?.driver_id) { setDriverInfo({ driverId: credentials.driver_id }); return; }
      }

      const { data } = await supabase.from("driver_credentials").select("driver_id").eq("user_id", actualUserId).maybeSingle();
      if (data?.driver_id) setDriverInfo({ driverId: data.driver_id });
    };
    fetchDriverInfo();
  }, [isAuthenticated, isAdmin, user?.id, user?.email]);

  // Fetch report heading
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('driver_income_settings').select('report_heading, report_note').limit(1).maybeSingle();
      if (data?.report_heading) setReportHeading(data.report_heading);
      if ((data as any)?.report_note) setReportNote((data as any).report_note);
    };
    if (isAuthenticated) fetchSettings();
  }, [isAuthenticated]);

  const fetchIncomeData = useCallback(async () => {
    setIsLoading(true);
    try {
      const PAGE_SIZE = 1000;
      let allData: DriverIncomeData[] = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase.from('driver_income').select('*').order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) { console.error("Error fetching income data:", error); return; }
        if (data && data.length > 0) { allData = [...allData, ...data]; hasMore = data.length === PAGE_SIZE; page++; }
        else hasMore = false;
      }
      setIncomeData(allData);
    } catch (err) { console.error("Unexpected error fetching income data:", err); }
    finally { setIsLoading(false); }
  }, [isAdmin, driverInfo?.driverId]);

  useEffect(() => { if (isAuthenticated) fetchIncomeData(); }, [fetchIncomeData, isAuthenticated]);

  const backPath = isAdmin || canAccessAdminPages ? "/home" : "/driver-portal";

  return (
    <PageLayout
      title={isAdmin || canAccessAdminPages ? "Driver Income Management" : "My Income Details"}
      icon={<FileSpreadsheet className="h-6 w-6" />}
      backPath={backPath}
      backLabel="Back to Home"
      gradient="from-background via-indigo-50/50 to-purple-100/50"
      headerActions={
        isAdmin && user?.id ? (
          <Button
            variant="outline"
            onClick={() => setShowUploader(!showUploader)}
            className="flex items-center gap-2 bg-background hover:bg-accent text-primary border-border"
          >
            <Upload className="h-4 w-4" />
            {showUploader ? 'Hide Uploader' : 'Import Excel/CSV'}
          </Button>
        ) : undefined
      }
    >
      {isAdmin && showUploader && user?.id && (
        <div className="mb-6 bg-card rounded-lg border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Import Driver Income Data</h2>
          <DriverIncomeUploader
            userId={user.id}
            onUploadSuccess={(heading: string) => { setReportHeading(heading); fetchIncomeData(); setShowUploader(false); }}
            reportHeading={reportHeading}
            onHeadingChange={setReportHeading}
            reportNote={reportNote}
            onNoteChange={setReportNote}
          />
        </div>
      )}

      {isAdmin || canAccessAdminPages ? (
        <DriverIncomeTable data={incomeData} isLoading={isLoading} onDataChange={fetchIncomeData} isAdmin={isAdmin} reportHeading={reportHeading} />
      ) : (
        <DriverIncomeReceipt data={incomeData} isLoading={isLoading} driverName={user?.username} permitId={driverInfo?.driverId} reportHeading={reportHeading} />
      )}

      <FloatingCalculator />
    </PageLayout>
  );
};

export default DriverIncomePage;
