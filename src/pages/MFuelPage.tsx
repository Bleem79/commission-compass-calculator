import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { PageLayout } from "@/components/shared/PageLayout";
import { Button } from "@/components/ui/button";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  bucket_name: string;
}

const MFuelPage = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const isAdmin = user?.role === "admin";

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('documents').select('*').eq('bucket_name', 'mfuel_documents');
      if (error) { toast.error('Error', { description: error.message }); return; }
      setDocuments(data || []);

      const urls: { [key: string]: string } = {};
      for (const doc of data || []) {
        if (doc.file_type.startsWith('image/')) {
          const { data: signedData, error: signedError } = await supabase.storage.from(doc.bucket_name).createSignedUrl(doc.file_path, 3600);
          if (!signedError && signedData) urls[doc.id] = signedData.signedUrl;
        }
      }
      setImageUrls(urls);
    } catch (err) {
      console.error("Unexpected error fetching documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const deleteDocument = async (document: Document) => {
    try {
      const { error: storageError } = await supabase.storage.from(document.bucket_name).remove([document.file_path]);
      if (storageError) { toast.error("Error deleting file from storage"); return; }
      const { error: dbError } = await supabase.from('documents').delete().eq('id', document.id);
      if (dbError) { toast.error("Error deleting document record"); return; }
      toast.success("Document deleted successfully");
      fetchDocuments();
    } catch (err) {
      console.error("Error deleting document:", err);
      toast.error("Failed to delete document");
    }
  };

  return (
    <PageLayout gradient="from-white via-indigo-50 to-purple-100">
      {isAdmin && user?.id && (
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => setShowUploader(!showUploader)}
            className="flex items-center gap-2 bg-background hover:bg-accent text-primary border-border"
          >
            <Upload className="h-4 w-4" />
            {showUploader ? 'Hide Uploader' : 'Upload Document'}
          </Button>
        </div>
      )}

      {showUploader && isAdmin && user?.id && (
        <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-6">
          <DocumentUploader
            bucketName="mfuel_documents"
            userId={user.id}
            onUploadSuccess={() => { fetchDocuments(); setShowUploader(false); }}
            isLoading={isUploading}
            setIsLoading={setIsUploading}
          />
        </div>
      )}

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-8 text-center">
            <p className="text-muted-foreground">No documents available.</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="relative">
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => deleteDocument(doc)} className="absolute top-2 right-2 z-10 text-destructive border-destructive/20 hover:bg-destructive/10 bg-background">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
              {doc.file_type.startsWith('image/') && imageUrls[doc.id] ? (
                <img src={imageUrls[doc.id]} alt={doc.file_name} className="w-full rounded-lg shadow-lg border border-indigo-100" />
              ) : (
                <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-6">
                  <p className="text-foreground">{doc.file_name}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </PageLayout>
  );
};

export default MFuelPage;
