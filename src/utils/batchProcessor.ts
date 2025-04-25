
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processBatch = async <T extends { email: string }>(
  items: T[],
  processItem: (item: T) => Promise<any>,
  batchSize: number = 5,
  delayMs: number = 2000
) => {
  const results = {
    success: [] as string[],
    errors: [] as Array<{ email: string; error: string }>
  };

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    for (const item of batch) {
      try {
        await processItem(item);
        results.success.push(item.email.toString());
      } catch (error: any) {
        console.error(`Failed to process item for ${item.email}:`, error);
        results.errors.push({ email: item.email.toString(), error: error.message });
      }
    }
    
    if (i + batchSize < items.length) {
      await delay(delayMs);
    }
  }
  
  return results;
};
