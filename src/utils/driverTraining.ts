export interface TrainingRow {
  id: string;
  driver_id: string;
  driver_name: string | null;
  training_name: string;
  training_date: string;
  training_time: string | null;
  room_no: string | null;
  attendance: "pending" | "present" | "absent";
  marked_at?: string | null;
}

const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
const pick = (row: Record<string, any>, keys: string[]) => {
  for (const k of Object.keys(row)) if (keys.includes(norm(k))) return row[k];
  return undefined;
};
const text = (v: any) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim());

export const toTrainingDate = (v: any, parseCode?: (n: number) => any): string | null => {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number" && parseCode) {
    const d = parseCode(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // DD/MM/YYYY
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const p = new Date(s);
  if (isNaN(p.getTime())) return null;
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`;
};

export const toTrainingTime = (v: any): string | null => {
  if (typeof v === "number" && v >= 0 && v < 1) {
    const mins = Math.round(v * 1440);
    const h = Math.floor(mins / 60), mm = mins % 60;
    return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  }
  return text(v);
};

export const parseTrainingRows = (raw: Record<string, any>[], parseCode?: (n: number) => any) => {
  let skipped = 0;
  const valid = [] as Omit<TrainingRow, "id" | "attendance">[];
  for (const r of raw) {
    const driver_id = text(pick(r, ["driverid", "driverno", "id"]));
    const training_name = text(pick(r, ["nameoftraining", "nameoftrainings", "training", "trainingname"]));
    const training_date = toTrainingDate(pick(r, ["date", "trainingdate"]), parseCode);
    if (!driver_id || !training_name || !training_date) { skipped++; continue; }
    valid.push({
      driver_id, training_name, training_date,
      driver_name: text(pick(r, ["name", "drivername", "drvrname"])),
      training_time: toTrainingTime(pick(r, ["time", "trainingtime"])),
      room_no: text(pick(r, ["roomno", "room", "roomnumber"])),
    });
  }
  return { valid, skipped };
};
