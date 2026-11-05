import { useEffect, useState } from "react";
import { GraduationCap, Loader2, CalendarDays, Clock, DoorOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageLayout } from "@/components/shared/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import type { TrainingRow } from "@/utils/driverTraining";

const label = { present: "Present", absent: "Absent", pending: "Scheduled" } as const;
const tone = { present: "bg-primary/15 text-primary", absent: "bg-destructive/15 text-destructive", pending: "bg-muted text-muted-foreground" } as const;

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
    <PageLayout title="My Training" icon={<GraduationCap className="w-6 h-6" />}>
      {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div> :
        rows.length === 0 ? <p className="text-center text-muted-foreground py-10">No training scheduled for you.</p> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}><CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-lg">{r.training_name}</div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone[r.attendance]}`}>{label[r.attendance]}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" />{new Date(r.training_date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
                {r.training_time && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{r.training_time}</span>}
                {r.room_no && <span className="flex items-center gap-1"><DoorOpen className="w-4 h-4" />Room {r.room_no}</span>}
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default DriverTrainingPage;
