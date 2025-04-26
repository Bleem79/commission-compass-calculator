
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processBatch = async <T extends { email: string }>(
  items: T[],
  processItem: (item: T) => Promise<any>,
  batchSize: number = 2, // Reduced batch size for more reliability
  delayMs: number = 7000 // Increased delay between batches to avoid rate limiting
) => {
  const results = {
    success: [] as string[],
    errors: [] as Array<{ email: string; error: string }>
  };

  console.log(`Starting batch processing of ${items.length} items with batchSize=${batchSize}, delayMs=${delayMs}`);
  
  // Use worker threads for background processing if available
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
        // Improve error handling for specific errors
        let errorMessage = error.message || 'Unknown error';
        
        // Check for RLS policy recursion errors and provide better error messages
        if (errorMessage.includes('infinite recursion') || 
            errorMessage.includes('policy') || 
            errorMessage.includes('violates row-level security')) {
          errorMessage = 'Permission error: Please check user roles policies';
          console.error('RLS policy error detected for', item.email, error);
        }
        
        results.errors.push({ email: item.email.toString(), error: errorMessage });
        return { success: false, email: item.email, error: errorMessage };
      }
    });
    
    // Wait for all promises in the batch to resolve with a longer timeout
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Batch processing timeout")), 60000) // 1 minute timeout
      );
      
      await Promise.race([
        Promise.all(batchPromises),
        timeoutPromise
      ]);
    } catch (error) {
      console.error("Batch processing error:", error);
      // Continue processing despite errors
    }
    
    // Add a delay between batches with better resilience for tab switching
    if (i + batchSize < items.length) {
      console.log(`Waiting ${delayMs}ms before processing next batch...`);
      
      // Use more browser-friendly delay implementation
      if (isBackgroundProcessingSupported) {
        await new Promise(resolve => {
          // @ts-ignore - TypeScript doesn't know about requestIdleCallback
          window.requestIdleCallback(() => {
            setTimeout(resolve, delayMs);
          }, { timeout: delayMs + 1000 });
        });
      } else {
        await delay(delayMs);
      }
    }
  }
  
  console.log(`Batch processing complete. Success: ${results.success.length}, Errors: ${results.errors.length}`);
  return results;
};
