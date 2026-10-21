import { describe, expect, test } from "bun:test";
import { nationalityRecipients, templateNationalities } from "./smsTemplates";

describe("SMS nationality templates", () => {
  test("one saved template supports multiple nationalities", () => {
    expect(templateNationalities({ nationality: "", nationalities: ["Pakistani", "Bangladesh", "Afghanistan"] }))
      .toEqual(["Pakistani", "Bangladesh", "Afghanistan"]);
  });
  test("selects unique active drivers across all selected nationalities", () => {
    expect(nationalityRecipients([{ driver_id: "1" }, { driver_id: "2" }, { driver_id: "3" }], [
      { driver_id: "1", nationality: "Pakistani" },
      { driver_id: "1", nationality: "Pakistani" },
      { driver_id: "2", nationality: "Bangladesh" },
      { driver_id: "3", nationality: "Other" },
      { driver_id: "4", nationality: "Afghanistan" },
    ], ["Pakistani", "Bangladesh", "Afghanistan"])).toEqual(["1", "2"]);
  });
  test("preserves old single-nationality templates", () => {
    expect(templateNationalities({ nationality: "Pakistani", nationalities: [] })).toEqual(["Pakistani"]);
  });
  test("matches case and surrounding spaces while preserving credential IDs", () => {
    expect(nationalityRecipients([{ driver_id: "111993" }, { driver_id: "002" }], [
      { driver_id: " 111993 ", nationality: " PAKISTANI " },
      { driver_id: "002", nationality: "Bangladeshi" },
      { driver_id: "111993", nationality: "Pakistani" },
    ], [" pakistani", "BANGLADESHI "])).toEqual(["111993", "002"]);
  });
  test("empty nationalities never target unclassified drivers", () => {
    expect(nationalityRecipients([{ driver_id: "1" }], [{ driver_id: "1", nationality: null }], [" "])).toEqual([]);
  });
});