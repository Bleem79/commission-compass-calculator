
import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentUploader } from './DocumentUploader';
import { DocumentList } from './DocumentList';

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
  icon?: React.ReactNode;
  isAdmin: boolean;
}

export const DocumentViewer = ({ bucketName, title, icon, isAdmin }: DocumentViewerProps) => {
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

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => {
          setIsOpen(true);
          fetchDocuments();
        }}
      >
        {icon && <span className="mr-2">{icon}</span>}
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
            {isAdmin && user?.id && (
              <DocumentUploader
                bucketName={bucketName}
                userId={user.id}
                onUploadSuccess={fetchDocuments}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}
            <DocumentList documents={documents} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
