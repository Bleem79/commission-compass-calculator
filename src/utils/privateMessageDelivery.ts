export async function deliverPrivateMessageBatches(
  driverIds: string[],
  insertBatch: (ids: string[]) => Promise<void>,
) {
  const sentIds: string[] = [];
  const failedIds: string[] = [];
  const uniqueIds = Array.from(new Set(driverIds));
  for (let offset = 0; offset < uniqueIds.length; offset += 50) {
    const batch = uniqueIds.slice(offset, offset + 50);
    try {
      await insertBatch(batch);
      sentIds.push(...batch);
    } catch {
      failedIds.push(...batch);
    }
  }
  return { sentIds, failedIds };
}

export async function collectMessagePages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
): Promise<T[]> {
  const records: T[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await fetchPage(from, from + 999);
    records.push(...page);
    if (page.length < 1000) return records;
  }
}