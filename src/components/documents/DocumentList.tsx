
import { Button } from "@/components/ui/button";
import { File, FileX } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  bucket_name: string;
}

interface DocumentListProps {
  documents: Document[];
  isAdmin?: boolean;
}

export const DocumentList = ({ documents, isAdmin = false }: DocumentListProps) => {
  const viewDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from(document.bucket_name)
        .createSignedUrl(document.file_path, 60);

      if (error) {
        console.error("Error creating signed URL:", error);
        toast.error('Error', { description: error.message });
        return;
      }

      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      console.error("Error viewing document:", err);
      toast.error('Error', {
        description: 'Failed to open document'
      });
    }
  };

  const deleteDocument = async (document: Document) => {
    try {
      // First delete from storage
      const { error: storageError } = await supabase.storage
        .from(document.bucket_name)
        .remove([document.file_path]);

      if (storageError) {
        console.error("Error deleting from storage:", storageError);
        toast.error('Error', { description: storageError.message });
        return;
      }

      // Then delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) {
        console.error("Error deleting from database:", dbError);
        toast.error('Error', { description: dbError.message });
        return;
      }

      toast.success('Success', { description: 'Document deleted successfully' });
    } catch (err: any) {
      console.error("Error deleting document:", err);
      toast.error('Error', {
        description: 'Failed to delete document'
      });
    }
  };

  return (
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => viewDocument(doc)}>
              View
            </Button>
            {isAdmin && (
              <Button 
                variant="ghost" 
                onClick={() => deleteDocument(doc)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <FileX className="h-5 w-5" />
                <span className="sr-only">Delete</span>
              </Button>
            )}
          </div>
        </div>
      ))}
      {documents.length === 0 && (
        <p className="text-center text-muted-foreground">No documents found</p>
      )}
    </div>
  );
};
