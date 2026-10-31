import { describe, expect, test } from "bun:test";
import { dubaiSubmissionDay, hasDailyRequest } from "./dailyRequestLimit";

describe("one request per driver per Dubai day", () => {
  test("one request blocks another regardless of type or status", () => {
    for (const request_type of ["day_off", "vehicle_change", "single_shift_to_double_shift"]) {
      for (const status of ["pending", "approved", "rejected", "in_progress"]) {
        expect(hasDailyRequest([{ created_at: "2026-10-31T05:00:00Z", request_type, status }],
          new Date("2026-10-31T06:35:00Z"))).toBe(true);
      }
    }
  });
  test("Dubai midnight resets the limit, not UTC midnight", () => {
    const requests = [{ created_at: "2026-10-31T06:35:00Z" }];
    expect(hasDailyRequest(requests, new Date("2026-10-31T19:59:59Z"))).toBe(true);
    expect(hasDailyRequest(requests, new Date("2026-10-31T20:00:00Z"))).toBe(false);
    expect(dubaiSubmissionDay("2026-10-31T20:00:00Z")).toBe("2026-11-01");
  });
  test("uses submission time, not the requested day-off date", () => {
    expect(hasDailyRequest([{ created_at: "2026-10-31T05:00:00Z", subject: "Day Off Request - 05 Nov 2026" }],
      new Date("2026-10-31T06:35:00Z"))).toBe(true);
  });
  test("drivers without a request today can submit", () => {
    expect(hasDailyRequest([], new Date("2026-10-31T06:35:00Z"))).toBe(false);
    expect(hasDailyRequest([{ created_at: "2026-10-30T19:59:59Z" }], new Date("2026-10-31T06:35:00Z"))).toBe(false);
  });
});