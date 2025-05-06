
import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DocumentUploaderProps {
  bucketName: string;
  userId: string;
  onUploadSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// Get the Supabase URL from environment
const SUPABASE_URL = "https://iahpiswzhkshejncylvt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhaHBpc3d6aGtzaGVqbmN5bHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwNzgwNzMsImV4cCI6MjA2MDY1NDA3M30.KOrHbCrL8bDregbGgHFsyJ84FdH0_UL-YUJNSPEtARQ";

export const DocumentUploader = ({ 
  bucketName, 
  userId, 
  onUploadSuccess, 
  isLoading, 
  setIsLoading 
}: DocumentUploaderProps) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const clearError = () => setUploadError(null);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Clear any previous errors
    clearError();

    if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please upload only PDF, JPG, or PNG files'
      });
      return;
    }

    // Set loading state
    setIsLoading(true);
    
    try {
      const filePath = `${Date.now()}-${file.name}`;
      console.log("Uploading file to bucket:", bucketName, "path:", filePath);
      
      // Get session for auth
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error(sessionError?.message || "No active session found");
      }
      
      let uploadSuccessful = false;
      let uploadError = null;
      
      // Try direct Supabase client upload first
      try {
        const { error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.warn("First upload method failed:", error);
          uploadError = error;
        } else {
          uploadSuccessful = true;
        }
      } catch (error) {
        console.warn("First upload method exception:", error);
        uploadError = error;
      }
      
      // If first method fails, try fetch API approach
      if (!uploadSuccessful) {
        try {
          // Create a blob from the file
          const fileBlob = new Blob([await file.arrayBuffer()], { type: file.type });
          
          console.log("Trying alternative upload method with fetch API");
          const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;
          
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sessionData.session.access_token}`,
              'apikey': SUPABASE_ANON_KEY,
              'x-upsert': 'false',
              'Content-Type': file.type,
            },
            body: fileBlob
          });
          
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
          }
          
          uploadSuccessful = true;
        } catch (fetchError) {
          console.error("Both upload methods failed:", fetchError);
          throw fetchError;
        }
      }
      
      if (!uploadSuccessful) {
        throw uploadError || new Error("Failed to upload file after multiple attempts");
      }
      
      // Store document metadata in database
      const { error: dbError } = await supabase.from('documents').insert({
        bucket_name: bucketName,
        file_name: file.name,
        file_type: file.type,
        file_path: filePath,
        uploaded_by: userId
      });

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error(dbError.message || "Failed to save document metadata");
      }

      // Show success message
      toast.success('Success', { 
        description: 'File uploaded successfully'
      });
      
      // Trigger callback to refresh document list
      onUploadSuccess();
      
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (error: any) {
      console.error("Upload error:", error);
      
      // More user-friendly error messages
      let errorMessage = "Failed to upload file";
      if (error.message?.includes("Failed to fetch") || error.message?.includes("Network Error")) {
        errorMessage = "Network error. Please check your internet connection and try again";
      } else if (error.message?.includes("timed out")) {
        errorMessage = "Upload timed out. Please try again with a smaller file or check your connection";
      } else if (error.message?.includes("permissions")) {
        errorMessage = "Permission denied. You may not have access to upload to this location";
      }
      
      setUploadError(errorMessage);
      toast.error('Upload Failed', {
        description: errorMessage
      });
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {uploadError && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>
            {uploadError}
            <div className="mt-2 text-xs">
              Try refreshing the page or checking your network connection.
              {retryCount > 1 && (
                <p className="mt-1 font-medium">
                  If you're behind a firewall or VPN, try disabling it temporarily.
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center gap-4">
        <input
          type="file"
          id={`file-upload-${bucketName}`}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          disabled={isLoading}
          onClick={clearError}
        />
        <Button
          variant="outline"
          onClick={() => document.getElementById(`file-upload-${bucketName}`)?.click()}
          disabled={isLoading}
          className="relative w-full md:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              <span>Upload Document</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
