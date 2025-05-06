
import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  canView: boolean;
}

export const DocumentViewer = ({ bucketName, title, icon, isAdmin, canView }: DocumentViewerProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchDocuments = useCallback(async () => {
    if (!canView) return;
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('bucket_name', bucketName);

      if (error) {
        console.error("Error fetching documents:", error);
        toast.error('Error', { description: error.message });
        return;
      }

      setDocuments(data || []);
    } catch (err) {
      console.error("Unexpected error fetching documents:", err);
    }
  }, [bucketName, canView]);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, fetchDocuments]);

  if (!canView && !isAdmin) {
    return (
      <p className="text-gray-500">You don't have permission to view these documents.</p>
    );
  }

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
        {isAdmin ? `Manage ${title} Documents` : `View ${title} Documents`}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title} Documents</DialogTitle>
            <DialogDescription>
              {isAdmin ? 
                `Upload and manage ${title.toLowerCase()} documents.` :
                `View ${title.toLowerCase()} documents.`
              }
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
            <DocumentList documents={documents} isAdmin={isAdmin} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
