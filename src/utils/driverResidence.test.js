import { expect, test } from "bun:test";
import { summarizeResidences, residenceCoordinates, residenceAdminAllowed } from "./driverResidence";

test("Driver Residence permits only administrators", () => {
  expect(["admin", "advanced", "user", "driver", undefined].map(residenceAdminAllowed)).toEqual([true, false, false, false, false]);
});
test("area counts use unique drivers and normalize city/area names", () => {
  const row = { driver_id: "100344", city: "Sharjah", area: "Al Nahda", google_map: null };
  const result = summarizeResidences([row, { ...row, driver_id: "100475", area: " al  nahda " }, row]);
  expect(result.total).toBe(2);
  expect(result.groups.map(g => g.count)).toEqual([2]);
});
test("newest residence wins and unassigned drivers remain in totals", () => {
  const result = summarizeResidences([
    { driver_id: "1", city: "Sharjah", area: "Al Nahda", google_map: null },
    { driver_id: "1", city: "Dubai", area: "Deira", google_map: null },
    { driver_id: "2", city: null, area: null, google_map: null },
  ]);
  expect([result.total, result.missing, result.groups.length, result.groups[0].city]).toEqual([2, 1, 1, "Sharjah"]);
});
test("extracts actual Google place coordinates rather than camera coordinates", () => {
  expect(residenceCoordinates("https://www.google.com/maps/place/Test/@25.2,55.3,12z/data=!3d25.31!4d55.41")).toEqual({ lat: 25.31, lng: 55.41 });
  expect(residenceCoordinates("https://maps.google.com/?q=25.31,55.41")).toEqual({ lat: 25.31, lng: 55.41 });
});
test("unresolved or invalid map locations never produce invented pins", () => {
  expect([null, "https://maps.app.goo.gl/abc", "https://evil.example/?q=25,55", "100,55"].map(residenceCoordinates)).toEqual([null, null, null, null]);
});
test("resolved short-link coordinates place areas on the map", () => {
  const result = summarizeResidences([
    { driver_id: "1", city: "Sharjah", area: "Al Nahda", google_map: "https://maps.app.goo.gl/abc" },
    { driver_id: "2", city: "Sharjah", area: "Al Nahda", google_map: "https://maps.app.goo.gl/def" },
    { driver_id: "3", city: "Sharjah", area: "Al Butina", google_map: "https://maps.app.goo.gl/fail" },
  ], { "https://maps.app.goo.gl/abc": { lat: 25.31, lng: 55.41 }, "https://maps.app.goo.gl/fail": null });
  expect(result.groups.map(g => [g.area, g.position])).toEqual([["Al Butina", null], ["Al Nahda", { lat: 25.31, lng: 55.41 }]]);
});