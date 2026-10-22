import { test, expect } from "bun:test";
import { unreadAdminNotificationIds } from "./adminNotificationReminder.ts";

test("a newly posted admin notification remains a reminder until opened", () => {
  expect(unreadAdminNotificationIds([{ id: "old" }, { id: "new" }], ["old"])).toEqual(["new"]);
});

test("opening notifications clears only the notifications already loaded", () => {
  expect(unreadAdminNotificationIds([{ id: "old" }, { id: "new" }], ["old", "new"])).toEqual([]);
  expect(unreadAdminNotificationIds([{ id: "new" }, { id: "later" }], ["old", "new"])).toEqual(["later"]);
});