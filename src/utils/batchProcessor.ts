
// Simple delay function for better control over timing
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processBatch = async <T extends { email: string }>(
  items: T[],
  processItem: (item: T) => Promise<any>,
  batchSize: number = 1, // Process one at a time for maximum reliability
  delayMs: number = 15000 // Significant delay between items to avoid rate limiting
) => {
  const results = {
    success: [] as string[],
    errors: [] as Array<{ email: string; error: string }>
  };

  console.log(`Starting sequential processing of ${items.length} items with delayMs=${delayMs}`);
  
  // Process one item at a time with significant delays
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`Processing item ${i+1}/${items.length} for ${item.email}`);
    
    try {
      await processItem(item);
      results.success.push(item.email);
      console.log(`Successfully processed item for ${item.email}`);
    } catch (error: any) {
      let errorMessage = error.message || 'Unknown error';
      console.error(`Error processing ${item.email}:`, errorMessage);
      results.errors.push({ email: item.email, error: errorMessage });
    }
    
    // Add a substantial delay between items to avoid rate limiting
    if (i < items.length - 1) {
      console.log(`Waiting ${delayMs}ms before processing next item...`);
      await delay(delayMs);
    }
  }
  
  console.log(`Processing complete. Success: ${results.success.length}, Errors: ${results.errors.length}`);
  return results;
};
