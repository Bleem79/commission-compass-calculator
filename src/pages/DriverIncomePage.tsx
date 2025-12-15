import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, Loader2, Trash2, Upload } from "lucide-react";
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

const DriverIncomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    } else if (!isAdmin) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('bucket_name', 'driver_income_documents');

      if (error) {
        console.error("Error fetching documents:", error);
        toast.error('Error', { description: error.message });
        return;
      }

      setDocuments(data || []);

      // Get signed URLs for all image documents
      const urls: { [key: string]: string } = {};
      for (const doc of data || []) {
        if (doc.file_type.startsWith('image/')) {
          const { data: signedData, error: signedError } = await supabase.storage
            .from(doc.bucket_name)
            .createSignedUrl(doc.file_path, 3600);

          if (!signedError && signedData) {
            urls[doc.id] = signedData.signedUrl;
          }
        }
      }
      setImageUrls(urls);
    } catch (err) {
      console.error("Unexpected error fetching documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchDocuments();
    }
  }, [fetchDocuments, isAdmin]);

  const deleteDocument = async (document: Document) => {
    try {
      const { error: storageError } = await supabase.storage
        .from(document.bucket_name)
        .remove([document.file_path]);

      if (storageError) {
        toast.error("Error deleting file from storage");
        return;
      }

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) {
        toast.error("Error deleting document record");
        return;
      }

      toast.success("Document deleted successfully");
      fetchDocuments();
    } catch (err) {
      console.error("Error deleting document:", err);
      toast.error("Failed to delete document");
    }
  };

  const handleClose = () => {
    navigate("/home");
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6 relative overflow-x-auto">
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

      <div className="max-w-6xl mx-auto pt-16">
        <h1 className="text-xl sm:text-2xl font-bold text-indigo-800 mb-6">
          Last Month 5 or 6days Driver Income
        </h1>

        {/* Admin Upload Section */}
        {user?.id && (
          <div className="mb-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setShowUploader(!showUploader)}
              className="flex items-center gap-2 bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200"
            >
              <Upload className="h-4 w-4" />
              {showUploader ? 'Hide Uploader' : 'Upload Document'}
            </Button>
          </div>
        )}

        {showUploader && user?.id && (
          <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-6">
            <DocumentUploader
              bucketName="driver_income_documents"
              userId={user.id}
              onUploadSuccess={() => {
                fetchDocuments();
                setShowUploader(false);
              }}
              isLoading={isUploading}
              setIsLoading={setIsUploading}
            />
          </div>
        )}

        {/* Documents Display */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : documents.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-8 text-center">
              <p className="text-gray-500">No documents available. Upload driver income data to get started.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteDocument(doc)}
                  className="absolute top-2 right-2 z-10 text-red-600 border-red-200 hover:bg-red-50 bg-white"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                
                {doc.file_type.startsWith('image/') && imageUrls[doc.id] ? (
                  <img
                    src={imageUrls[doc.id]}
                    alt={doc.file_name}
                    className="w-full rounded-lg shadow-lg border border-indigo-100"
                  />
                ) : (
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-6">
                    <p className="text-gray-700">{doc.file_name}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverIncomePage;
