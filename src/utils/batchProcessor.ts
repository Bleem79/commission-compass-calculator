
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processBatch = async <T extends { email: string }>(
  items: T[],
  processItem: (item: T) => Promise<any>,
  batchSize: number = 3, // Keep batch size small for reliability
  delayMs: number = 5000 // Keep delay between batches to avoid rate limiting
) => {
  const results = {
    success: [] as string[],
    errors: [] as Array<{ email: string; error: string }>
  };

  console.log(`Starting batch processing of ${items.length} items with batchSize=${batchSize}, delayMs=${delayMs}`);
  
  // Use worker threads for background processing if available and relevant
  const isBackgroundProcessingSupported = typeof window !== 'undefined' && 'requestIdleCallback' in window;
  
  // Process in sequential batches for better reliability
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(items.length/batchSize)}`);
    
    // Create an array of promises for the batch
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
    // Set a longer timeout to ensure background processing continues
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Batch processing timeout")), 30000)
      );
      
      await Promise.race([
        Promise.all(batchPromises),
        timeoutPromise
      ]);
    } catch (error) {
      console.error("Batch processing error:", error);
      // Continue processing despite errors
    }
    
    // Add a delay between batches but make it more resilient
    if (i + batchSize < items.length) {
      console.log(`Waiting ${delayMs}ms before processing next batch...`);
      
      // Use more browser-friendly delay implementation
      if (isBackgroundProcessingSupported) {
        await new Promise(resolve => {
          // @ts-ignore - TypeScript doesn't know about requestIdleCallback
          window.requestIdleCallback(() => {
            setTimeout(resolve, delayMs);
          });
        });
      } else {
        await delay(delayMs);
      }
    }
  }
  
  console.log(`Batch processing complete. Success: ${results.success.length}, Errors: ${results.errors.length}`);
  return results;
};
