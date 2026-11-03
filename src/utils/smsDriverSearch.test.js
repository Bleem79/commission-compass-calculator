import { describe, expect, test } from "bun:test";
import { filterDriversBySearch, parseDriverIdTokens, unmatchedDriverIdTokens } from "./smsDriverSearch";

const drivers = [
  { driver_id: "112857" },
  { driver_id: "113923" },
  { driver_id: "115422" },
  { driver_id: "200001" },
];

describe("SMS multi driver ID search", () => {
  test("splits pasted IDs on spaces, commas and newlines without duplicates", () => {
    expect(parseDriverIdTokens("112857 113923,115422\n112857")).toEqual(["112857", "113923", "115422"]);
  });
  test("empty search returns every driver", () => {
    expect(filterDriversBySearch(drivers, "  ")).toHaveLength(4);
  });
  test("single token keeps partial matching", () => {
    expect(filterDriversBySearch(drivers, "113").map((d) => d.driver_id)).toEqual(["113923"]);
  });
  test("multiple pasted IDs match any of them", () => {
    expect(filterDriversBySearch(drivers, "112857 113923 115422").map((d) => d.driver_id))
      .toEqual(["112857", "113923", "115422"]);
  });
  test("reports pasted IDs with no active driver", () => {
    expect(unmatchedDriverIdTokens(drivers, "112857 999999")).toEqual(["999999"]);
    expect(unmatchedDriverIdTokens(drivers, "112857")).toEqual([]);
  });
});
