import { expect, test } from "bun:test";
import { collectMessagePages, deliverPrivateMessageBatches } from "./privateMessageDelivery";

test("all 579 matched drivers receive one insert, including the final batch", async () => {
  const ids = Array.from({ length: 579 }, (_, i) => String(i));
  const batches = [];
  const result = await deliverPrivateMessageBatches(ids, async batch => { batches.push(batch); });
  expect(result.sentIds).toEqual(ids);
  expect(result.failedIds).toEqual([]);
  expect(batches.map(batch => batch.length)).toEqual([...Array(11).fill(50), 29]);
});

test("failed recipients are retained for retry and excluded from push recipients", async () => {
  const ids = Array.from({ length: 101 }, (_, i) => String(i));
  const result = await deliverPrivateMessageBatches(ids, async batch => {
    if (batch.includes("50")) throw new Error("Insert failed");
  });
  expect(result.sentIds).toEqual([...ids.slice(0, 50), "100"]);
  expect(result.failedIds).toEqual(ids.slice(50, 100));
});

test("duplicate recipients are sent only once", async () => {
  const result = await deliverPrivateMessageBatches(["1", "1", "2"], async () => {});
  expect(result.sentIds).toEqual(["1", "2"]);
});

test("message reads include records beyond the first 1000", async () => {
  const all = Array.from({ length: 13404 }, (_, i) => i);
  expect(await collectMessagePages(async (from, to) => all.slice(from, to + 1))).toEqual(all);
});