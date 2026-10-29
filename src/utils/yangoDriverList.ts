export const pickYangoField = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of Object.keys(row)) {
    const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
    if (keys.includes(normalized)) {
      const value = row[key];
      return value === null || value === undefined ? "" : String(value).trim();
    }
  }
  return "";
};

export const parseYangoDriverRow = (row: Record<string, unknown>, uploadedBy: string | null) => ({
  s_no: Number(pickYangoField(row, ["sno", "sn", "srno", "serialno"])) || null,
  driver_id: pickYangoField(row, ["driverid", "driverno", "empcde", "id"]),
  driver_name: pickYangoField(row, ["drvrname", "drivername", "name"]) || null,
  gender: pickYangoField(row, ["gender", "sex"]) || null,
  nationality: pickYangoField(row, ["nationality"]) || null,
  mobile_no: pickYangoField(row, ["mobileno", "mobile", "phone", "phoneno", "contactno"]) || null,
  status: pickYangoField(row, ["status"]) || null,
  hr_status: pickYangoField(row, ["hrstatus"]) || null,
  city: locationOrNull(row, ["city"]),
  area: locationOrNull(row, ["area"]),
  google_map: locationOrNull(row, ["googlemap", "googlemaps"]),
  uploaded_by: uploadedBy,
});