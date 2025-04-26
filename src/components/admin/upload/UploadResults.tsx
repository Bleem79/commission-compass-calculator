
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
  return (
    <Alert variant={stats.failed > 0 ? "destructive" : "default"} className="mt-3">
      <AlertTitle>Upload Results</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <div>
            Total: {stats.total} | 
            Successful: {stats.success} | 
            Failed: {stats.failed}
          </div>
          
          {stats.failed > 0 && stats.errors && (
            <div className="text-sm mt-2">
              <strong>Common error reasons:</strong>
              <ul className="list-disc pl-5 mt-1">
                <li>Email already exists in system</li>
                <li>Driver ID already exists</li>
                <li>Network connection issues</li>
                <li>Rate limiting from the authentication service</li>
              </ul>
              
              <div className="mt-2 max-h-40 overflow-y-auto border border-red-200 rounded-md p-2 bg-red-50">
                <p className="font-semibold mb-1">Specific errors:</p>
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
