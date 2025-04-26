
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processBatch = async <T extends { email: string }>(
  items: T[],
  processItem: (item: T) => Promise<any>,
  batchSize: number = 3, // Reduced from 5 to 3 for better reliability
  delayMs: number = 5000 // Increased from 3000 to 5000 for better rate limiting
) => {
  const results = {
    success: [] as string[],
    errors: [] as Array<{ email: string; error: string }>
  };

  console.log(`Starting batch processing of ${items.length} items with batchSize=${batchSize}, delayMs=${delayMs}`);
  
  // Process in sequential batches for better reliability
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(items.length/batchSize)}`);
    
    // Process items in parallel within each batch with individual error handling
    const batchPromises = batch.map(async (item) => {
      try {
        console.log(`Processing item for ${item.email}`);
        await processItem(item);
        results.success.push(item.email.toString());
        console.log(`Successfully processed item for ${item.email}`);
        return { success: true, email: item.email };
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        console.error(`Failed to process item for ${item.email}:`, error);
        results.errors.push({ email: item.email.toString(), error: errorMessage });
        return { success: false, email: item.email, error: errorMessage };
      }
    });
    
    // Wait for all promises in the batch to resolve
    await Promise.all(batchPromises);
    
    // Add a delay between batches to avoid rate limiting
    if (i + batchSize < items.length) {
      console.log(`Waiting ${delayMs}ms before processing next batch...`);
      await delay(delayMs);
    }
  }
  
  console.log(`Batch processing complete. Success: ${results.success.length}, Errors: ${results.errors.length}`);
  return results;
};
