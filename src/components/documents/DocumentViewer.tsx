
import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('bucket_name', bucketName);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setDocuments(data || []);
  }, [bucketName]);

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

    if (!user) {
      toast({ 
        title: 'Authentication Error', 
        description: 'You must be logged in to upload files', 
        variant: 'destructive' 
      });
      return;
    }

    setIsLoading(true);
    try {
      const filePath = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert({
        bucket_name: bucketName,
        file_name: file.name,
        file_type: file.type,
        file_path: filePath,
        uploaded_by: user.role === 'admin' ? user.username : 'guest' // This is a temporary solution
      });

      if (dbError) throw dbError;

      toast({ title: 'Success', description: 'File uploaded successfully' });
      await fetchDocuments();
    } catch (error) {
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
    const { data, error } = await supabase.storage
      .from(document.bucket_name)
      .createSignedUrl(document.file_path, 60);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    window.open(data.signedUrl, '_blank');
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
                  Upload Document
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
