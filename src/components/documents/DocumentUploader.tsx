
import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, AlertTriangle } from 'lucide-react';
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

    // Validate file type
    if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Please upload only PDF, JPG, or PNG files'
      });
      return;
    }

    // Set loading state
    setIsLoading(true);
    
    try {
      // Create a unique filename to avoid conflicts
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = fileName.replace(/\s+/g, '_');
      
      console.log("Uploading file to bucket:", bucketName, "path:", filePath);
      
      // Simple direct upload
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Use upsert to override if file exists
        });
      
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      
      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
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
      
      // Reset retry count and error state on success
      setRetryCount(0);
      setUploadError(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      
      // More user-friendly error messages
      let errorMessage = "Failed to upload file";
      if (error.message?.includes("permissions")) {
        errorMessage = "Permission denied. You may not have access to upload to this location";
      } else if (error.message?.includes("storage error")) {
        errorMessage = "Storage error. Please try with a smaller file or a different format";
      } else if (error.message?.includes("already exists")) {
        errorMessage = "A file with this name already exists. Please rename your file and try again";
      } else if (error.message?.includes("fetch")) {
        errorMessage = "Network connection issue. Please check your internet connection and try again";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "The upload timed out. Please try again with a smaller file or check your connection";
      } else if (error.message?.includes("aborted")) {
        errorMessage = "The upload was aborted. Please try again";
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
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {uploadError}
            {retryCount > 1 && (
              <div className="mt-2 text-xs">
                Try using a shorter file name or a different file format.
              </div>
            )}
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
      
      {retryCount > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Having trouble? Try uploading a smaller file or using a different file format.
        </p>
      )}
    </div>
  );
};

