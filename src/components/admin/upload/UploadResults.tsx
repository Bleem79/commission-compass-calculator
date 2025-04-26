
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface UploadResultsProps {
  stats: {
    total: number;
    success: number;
    failed: number;
    errors?: Array<{ email: string; error: string }>;
  };
}

export const UploadResults = ({ stats }: UploadResultsProps) => {
  const groupedErrors = stats.errors?.reduce((acc, curr) => {
    const error = curr.error.toLowerCase();
    
    if (error.includes('already registered') || error.includes('already exists')) {
      acc.duplicates.push(curr);
    } else if (error.includes('rate limit') || error.includes('too many requests')) {
      acc.rateLimits.push(curr);
    } else {
      acc.others.push(curr);
    }
    
    return acc;
  }, { duplicates: [] as typeof stats.errors, rateLimits: [] as typeof stats.errors, others: [] as typeof stats.errors } as Record<string, typeof stats.errors>);

  return (
    <Alert variant={stats.failed > 0 ? "destructive" : "default"} className="mt-3">
      <AlertTitle>Upload Results</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <div className="text-base">
            Total: <strong>{stats.total}</strong> | 
            Successful: <strong>{stats.success}</strong> | 
            Failed: <strong>{stats.failed}</strong>
          </div>
          
          {stats.failed > 0 && stats.errors && (
            <div className="text-sm mt-2">
              <strong>Common error reasons:</strong>
              <ul className="list-disc pl-5 mt-1">
                {groupedErrors?.duplicates?.length ? (
                  <li>{groupedErrors.duplicates.length} error(s) due to duplicates (email or driver ID already exists)</li>
                ) : null}
                {groupedErrors?.rateLimits?.length ? (
                  <li>{groupedErrors.rateLimits.length} error(s) due to rate limiting from Supabase</li>
                ) : null}
                <li>Supabase authentication rate limits (max ~5-10 users/minute)</li>
                <li>Network connection issues</li>
              </ul>
              
              <div className="mt-2 max-h-60 overflow-y-auto border border-red-200 rounded-md p-2 bg-red-50">
                <p className="font-semibold mb-1">Failed accounts ({stats.errors.length}):</p>
                {stats.errors.map((err, index) => (
                  <div key={index} className="text-xs mb-1 pb-1 border-b border-red-100 last:border-0">
                    <span className="font-medium">{err.email}:</span> {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
