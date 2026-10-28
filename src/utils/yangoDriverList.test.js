import { describe, expect, test } from "bun:test";
import { parseYangoDriverRow } from "./yangoDriverList";

describe("Yango driver list uploads", () => {
  test("imports City", () => {
    expect(parseYangoDriverRow({ "Driver Id": "100344", City: "Sharjah" }, null).city).toBe("Sharjah");
  });
  test("imports Area", () => {
    expect(parseYangoDriverRow({ "Driver Id": "100344", Area: "Al Nahda" }, null).area).toBe("Al Nahda");
  });
  test("imports Google Map", () => {
    expect(parseYangoDriverRow({ "Driver Id": "100344", "Google Map": "https://maps.google.com/?q=Sharjah" }, null).google_map)
      .toBe("https://maps.google.com/?q=Sharjah");
  });
  test("older eight-column files remain valid with empty optional locations", () => {
    expect(parseYangoDriverRow({ "S.No": 1, "Driver Id": "00100344", "Drvr Name": "Driver", Gender: "M", Nationality: "Bangladeshi", "Mobile No": "971502087454", Status: "OSR", "HR Status": "Resigned" }, null))
      .toEqual({ s_no: 1, driver_id: "00100344", driver_name: "Driver", gender: "M", nationality: "Bangladeshi", mobile_no: "971502087454", status: "OSR", hr_status: "Resigned", city: null, area: null, google_map: null, uploaded_by: null });
  });
});