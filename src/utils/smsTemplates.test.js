import { describe, expect, test } from "bun:test";
import { filterNationalities, nationalityRecipients, templateNationalities } from "./smsTemplates";

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

describe("Nationality search in the Send SMS dialog", () => {
  const options = ["Afghani", "Bangladeshi", "Indian", "Pakistani", "Nepali"];

  test("an empty search keeps the whole nationality list", () => {
    expect(filterNationalities(options, "   ")).toEqual(options);
  });
  test("a search narrows the list without changing the saved selection", () => {
    expect(filterNationalities(options, "afgh")).toEqual(["Afghani"]);
    expect(filterNationalities(options, "ind")).toEqual(["Indian"]);
  });
  test("searching is case insensitive and matches anywhere in the name", () => {
    expect(filterNationalities(options, "ANI")).toEqual(["Afghani", "Pakistani"]);
    expect(filterNationalities(options, "ang")).toEqual(["Bangladeshi"]);
  });
  test("several search terms can be pasted at once", () => {
    expect(filterNationalities(options, "afghani, indian")).toEqual(["Afghani", "Indian"]);
  });
  test("a search that matches nothing returns an empty list", () => {
    expect(filterNationalities(options, "zzz")).toEqual([]);
  });
});
