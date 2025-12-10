
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, X, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentUploader } from "@/components/documents/DocumentUploader";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  bucket_name: string;
}

const MFuelPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const isAdmin = user?.role === "admin";
  const isGuest = user?.role === "guest";

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('bucket_name', 'mfuel_documents');

      if (error) {
        console.error("Error fetching documents:", error);
        toast.error('Error', { description: error.message });
        return;
      }

      setDocuments(data || []);
    } catch (err) {
      console.error("Unexpected error fetching documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const viewDocument = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from(document.bucket_name)
        .createSignedUrl(document.file_path, 3600);

      if (error) {
        toast.error("Error accessing document");
        return;
      }

      const link = window.document.createElement('a');
      link.href = data.signedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (err) {
      console.error("Error viewing document:", err);
      toast.error("Failed to open document");
    }
  };

  const handleClose = () => {
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6 relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-10"
        onClick={handleClose}
      >
        <X className="h-6 w-6 text-gray-600 hover:text-gray-900" />
      </Button>
      
      <Button
        variant="outline"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200"
        onClick={handleClose}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Button>

      <div className="max-w-4xl mx-auto pt-16">
        <h1 className="text-3xl font-bold text-indigo-800 mb-6">M-fuel Percentage</h1>

        {(isAdmin || isGuest) && (
          <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-6">
            {isAdmin && user?.id && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-indigo-700 mb-4">Upload Documents</h3>
                <DocumentUploader
                  bucketName="mfuel_documents"
                  userId={user.id}
                  onUploadSuccess={fetchDocuments}
                  isLoading={isUploading}
                  setIsLoading={setIsUploading}
                />
              </div>
            )}

            <h3 className="text-lg font-semibold text-indigo-700 mb-4">Documents</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No documents available.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <span className="text-gray-700">{doc.file_name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewDocument(doc)}
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MFuelPage;
