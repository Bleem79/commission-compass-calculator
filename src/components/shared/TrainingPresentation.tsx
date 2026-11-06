import { CalendarDays, Check, Clock, DoorOpen, GraduationCap, X } from "lucide-react";
import type { TrainingRow } from "@/utils/driverTraining";

export const TrainingAttendance = ({ value, driver = false }: { value: TrainingRow["attendance"]; driver?: boolean }) => {
  const Icon = value === "present" ? Check : value === "absent" ? X : Clock;
  const tone = value === "present" ? "bg-accent text-accent-foreground border-primary/20" : value === "absent" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-background text-muted-foreground border-border";
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${tone}`}><Icon className="h-3.5 w-3.5" />{value === "present" ? "Present" : value === "absent" ? "Absent" : driver ? "Scheduled" : "Pending"}</span>;
};

export const TrainingDate = ({ date }: { date: string }) => {
  const value = new Date(`${date}T00:00:00`);
  return <div className="flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-md border border-primary/20 bg-accent text-accent-foreground">
    <span className="w-full border-b border-primary/10 py-1 text-center text-xs font-semibold uppercase">{value.toLocaleDateString("en-GB", { month: "short" })}</span>
    <span className="py-1 text-2xl font-bold leading-none">{value.getDate()}</span>
    <span className="pb-1 text-xs">{value.getFullYear()}</span>
  </div>;
};

export const TrainingDetails = ({ row }: { row: TrainingRow }) => <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-primary" />{new Date(`${row.training_date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
  {row.training_time && <span className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-primary" />{row.training_time}</span>}
  {row.room_no && <span className="flex min-w-0 items-center gap-2"><DoorOpen className="h-4 w-4 shrink-0 text-primary" /><span className="break-words">{ /^room\b/i.test(row.room_no) ? row.room_no : `Room ${row.room_no}`}</span></span>}
</div>;

export const TrainingSummary = ({ total, present, absent }: { total: number; present: number; absent: number }) => <div className="grid grid-cols-3 divide-x divide-border border-y border-border bg-card py-5 sm:py-6">
  {[{ label: "Total", count: total, icon: GraduationCap, tone: "text-primary" }, { label: "Present", count: present, icon: Check, tone: "text-primary" }, { label: "Absent", count: absent, icon: X, tone: "text-destructive" }].map(({ label, count, icon: Icon, tone }) => <div key={label} className="flex flex-col items-center gap-1 px-2 sm:flex-row sm:justify-center sm:gap-4">
    <span className={`hidden rounded-md bg-background p-2.5 sm:block ${tone}`}><Icon className="h-5 w-5" /></span>
    <div className="text-center sm:text-left"><div className="text-2xl font-bold tabular-nums sm:text-3xl">{count.toLocaleString("en-US")}</div><div className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</div></div>
  </div>)}
</div>;

export const TrainingEmpty = ({ driver = false }: { driver?: boolean }) => <div className="flex flex-col items-center gap-3 py-16 text-center">
  <GraduationCap className="h-10 w-10 text-primary/60" />
  <h2 className="font-semibold">{driver ? "No training scheduled" : "No trainings found"}</h2>
</div>;