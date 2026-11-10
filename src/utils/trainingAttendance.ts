import { toTrainingDate, toTrainingTime, type TrainingRow } from "./driverTraining";

export interface AttendanceUpdate { id: string; driver_id: string; training_name: string; attendance: "present" | "absent" }
export interface AttendancePreview { updates: AttendanceUpdate[]; issues: string[] }
const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase();
const get = (row: Record<string, unknown>, aliases: string[]) => {
  const key = Object.keys(row).find((k) => aliases.includes(k.toLowerCase().replace(/[^a-z0-9]/g, "")));
  return key ? row[key] : undefined;
};

export function prepareAttendanceUpload(raw: Record<string, unknown>[], trainings: TrainingRow[], parseCode?: (n: number) => { y: number; m: number; d: number } | null): AttendancePreview {
  const updates: AttendanceUpdate[] = [];
  const issues: string[] = [];
  const seen = new Set<string>();
  raw.forEach((row, index) => {
    const fail = (reason: string) => issues.push(`Row ${index + 2}: ${reason}`);
    const attendance = normalized(get(row, ["attendance", "status"]));
    if (attendance !== "present" && attendance !== "absent") { fail("Attendance must be Present or Absent"); return; }
    const id = normalized(get(row, ["trainingid", "recordid"]));
    const driverId = normalized(get(row, ["driverid", "driverno"]));
    const name = normalized(get(row, ["nameoftraining", "nameoftrainings", "trainingname", "training"]));
    const date = toTrainingDate(get(row, ["date", "trainingdate"]), parseCode);
    const time = toTrainingTime(get(row, ["time", "trainingtime"]));
    const room = normalized(get(row, ["roomno", "room", "roomnumber"]));
    if (!driverId || (!id && (!name || !date))) { fail("Driver Id, Name of Training and Date are required without a Training ID"); return; }
    const matches = trainings.filter((r) => normalized(r.driver_id) === driverId && (id ? normalized(r.id) === id : normalized(r.training_name) === name && r.training_date === date && (!time || normalized(r.training_time) === normalized(time)) && (!room || normalized(r.room_no) === room)));
    if (!matches.length) { fail(`No matching training for ${driverId}`); return; }
    if (matches.length > 1) { fail(`Multiple trainings match ${driverId}; use the Training ID from the template`); return; }
    const match = matches[0];
    if (seen.has(match.id)) { fail(`Duplicate attendance for ${driverId}`); return; }
    seen.add(match.id);
    updates.push({ id: match.id, driver_id: match.driver_id, training_name: match.training_name, attendance });
  });
  return { updates, issues };
}

export const attendanceTemplateRows = (rows: TrainingRow[]) => rows.map((r) => ({ "Training ID": r.id, "Driver Id": r.driver_id, Name: r.driver_name ?? "", "Name of Training": r.training_name, Date: r.training_date, Time: r.training_time ?? "", "Room No": r.room_no ?? "", Attendance: r.attendance === "pending" ? "" : r.attendance === "present" ? "Present" : "Absent" }));
/** Records whose attendance a bulk "Clear Attendance" would reset to pending. */
export const markedTrainingIds = (rows: { id?: string; attendance?: string | null }[]) =>
  rows.filter((r) => r.id && r.attendance && r.attendance !== "pending").map((r) => r.id as string);

/** Splits IDs into fixed-size batches so bulk writes stay within request limits. */
export const chunkIds = (ids: string[], size = 200) => {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
};
