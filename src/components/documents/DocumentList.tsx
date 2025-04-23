
import { Button } from "@/components/ui/button";
import { File } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  bucket_name: string;
}

interface DocumentListProps {
  documents: Document[];
}

export const DocumentList = ({ documents }: DocumentListProps) => {
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
  );
};
