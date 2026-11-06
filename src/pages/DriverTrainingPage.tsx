import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageLayout } from "@/components/shared/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { TrainingAttendance, TrainingDate, TrainingDetails, TrainingSummary, TrainingEmpty } from "@/components/shared/TrainingPresentation";
import type { TrainingRow } from "@/utils/driverTraining";

const DriverTrainingPage = () => {
  const { driverInfo, loading: driverLoading } = useDriverCredentials();
  const [rows, setRows] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (driverLoading) return;
    if (!driverInfo?.driverId) { setLoading(false); return; }
    (supabase as any).from("driver_trainings").select("*").eq("driver_id", driverInfo.driverId)
      .order("training_date", { ascending: false })
      .then(({ data }: any) => { setRows(data || []); setLoading(false); });
  }, [driverInfo?.driverId, driverLoading]);

  return (
    <PageLayout title="My Training" icon={<GraduationCap className="w-6 h-6 text-primary" />} gradient="from-background to-background" maxWidth="4xl">
      {loading ? <div role="status" aria-label="Loading trainings" className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
        rows.length === 0 ? <TrainingEmpty driver /> : (
        <div className="space-y-6">
          <TrainingSummary total={rows.length} present={rows.filter((r) => r.attendance === "present").length} absent={rows.filter((r) => r.attendance === "absent").length} />
          <h2 className="text-lg font-semibold">Training schedule</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <Card key={r.id} className="rounded-lg shadow-none overflow-hidden"><CardContent className="p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <TrainingDate date={r.training_date} />
                  <TrainingAttendance value={r.attendance} driver />
                </div>
                <h3 className="break-words text-lg font-semibold leading-snug">{r.training_name}</h3>
                <div className="mt-5 border-t border-border pt-4"><TrainingDetails row={r} /></div>
              </CardContent></Card>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default DriverTrainingPage;
