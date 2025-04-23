
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileUp } from 'lucide-react';
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

    if (!['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please upload only PDF or JPG files', 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);
    try {
      const filePath = `${Date.now()}-${file.name}`;
      console.log("Uploading file to bucket:", bucketName, "path:", filePath);
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }
      
      console.log("File uploaded successfully:", uploadData);

      const { error: dbError } = await supabase.from('documents').insert({
        bucket_name: bucketName,
        file_name: file.name,
        file_type: file.type,
        file_path: filePath,
        uploaded_by: userId
      });

      if (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }

      toast({ title: 'Success', description: 'File uploaded successfully' });
      onUploadSuccess();
      
      if (event.target) {
        event.target.value = '';
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to upload file', 
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
        accept=".pdf,.jpg,.jpeg"
        onChange={handleFileUpload}
        disabled={isLoading}
      />
      <Button
        variant="outline"
        onClick={() => document.getElementById(`file-upload-${bucketName}`)?.click()}
        disabled={isLoading}
      >
        <FileUp className="mr-2 h-4 w-4" />
        {isLoading ? 'Uploading...' : 'Upload Document'}
      </Button>
    </div>
  );
};
