
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processBatch = async <T extends { email: string }>(
  items: T[],
  processItem: (item: T) => Promise<any>,
  batchSize: number = 3,
  delayMs: number = 3000
) => {
  const results = {
    success: [] as string[],
    errors: [] as Array<{ email: string; error: string }>
  };

  console.log(`Starting batch processing of ${items.length} items with batchSize=${batchSize}, delayMs=${delayMs}`);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(items.length/batchSize)}`);
    
    // Process items in the current batch sequentially with delay between each item
    for (const item of batch) {
      try {
        console.log(`Processing item for ${item.email}`);
        await processItem(item);
        results.success.push(item.email.toString());
        console.log(`Successfully processed item for ${item.email}`);
        
        // Add a small delay between individual items in a batch
        await delay(500);
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        console.error(`Failed to process item for ${item.email}:`, error);
        results.errors.push({ email: item.email.toString(), error: errorMessage });
      }
    }
    
    // Add a longer delay between batches
    if (i + batchSize < items.length) {
      console.log(`Waiting ${delayMs}ms before processing next batch...`);
      await delay(delayMs);
    }
  }
  
  console.log(`Batch processing complete. Success: ${results.success.length}, Errors: ${results.errors.length}`);
  return results;
};
