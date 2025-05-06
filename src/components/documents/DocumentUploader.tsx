
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please upload only PDF, JPG, or PNG files', 
        variant: 'destructive' 
      });
      return;
    }

    // Set loading state
    setIsLoading(true);
    
    try {
      const filePath = `${Date.now()}-${file.name}`;
      console.log("Uploading file to bucket:", bucketName, "path:", filePath);
      
      // Upload file to storage with proper options and timeout handling
      const uploadPromise = supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      // Add timeout for the upload
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Upload timed out after 30 seconds")), 30000);
      });
      
      // Race the upload against the timeout
      const { error: uploadError, data: uploadData } = await Promise.race([
        uploadPromise,
        timeoutPromise.then(() => {
          throw new Error("Upload timed out");
        })
      ]) as any;

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(uploadError.message || "Failed to upload file");
      }
      
      console.log("File uploaded successfully:", uploadData);

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
      toast({ title: 'Success', description: 'File uploaded successfully' });
      
      // Trigger callback to refresh document list
      onUploadSuccess();
      
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
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
      
      toast({ 
        title: 'Upload Failed', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        id={`file-upload-${bucketName}`}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileUpload}
        disabled={isLoading}
      />
      <Button
        variant="outline"
        onClick={() => document.getElementById(`file-upload-${bucketName}`)?.click()}
        disabled={isLoading}
        className="relative"
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
  );
};
