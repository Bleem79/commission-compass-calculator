import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FileUp, File } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  bucket_name: string;
}

interface DocumentViewerProps {
  bucketName: string;
  title: string;
  isAdmin: boolean;
}

export const DocumentViewer = ({ bucketName, title, isAdmin }: DocumentViewerProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('bucket_name', bucketName);

      if (error) {
        console.error("Error fetching documents:", error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }

      setDocuments(data || []);
    } catch (err) {
      console.error("Unexpected error fetching documents:", err);
    }
  }, [bucketName]);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, fetchDocuments]);

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

    if (!user || !user.id) {
      toast({ 
        title: 'Authentication Error', 
        description: 'You must be logged in with a valid user ID to upload files', 
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
        uploaded_by: user.id
      });

      if (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }

      toast({ title: 'Success', description: 'File uploaded successfully' });
      await fetchDocuments();
      
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

  const viewDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from(document.bucket_name)
        .createSignedUrl(document.file_path, 60);

      if (error) {
        console.error("Error creating signed URL:", error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }

      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error("Error viewing document:", err);
      toast({
        title: 'Error',
        description: 'Failed to open document',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => {
          setIsOpen(true);
          fetchDocuments();
        }}
      >
        {title}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title} Documents</DialogTitle>
            <DialogDescription>
              View and manage documents related to {title.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isAdmin && (
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
            )}

            <div className="grid gap-4">
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    <File className="h-5 w-5" />
                    <span>{doc.file_name}</span>
                  </div>
                  <Button variant="ghost" onClick={() => viewDocument(doc)}>
                    View
                  </Button>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-center text-muted-foreground">No documents found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
