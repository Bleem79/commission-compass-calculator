
import { useEffect } from "react";
import { toast } from "sonner";
import { useDriverUpload } from "@/hooks/useDriverUpload";
import { UploadForm } from "./upload/UploadForm";
import { UploadProgress } from "./upload/UploadProgress";
import { UploadResults } from "./upload/UploadResults";
import { useAuth } from "@/contexts/AuthContext";

export const DriverCredentialsUploader = () => {
  const { isAdmin } = useAuth();
  const { 
    isUploading,
    progress,
    currentItem,
    totalItems,
    uploadStats,
    processingRef,
    handleFileUpload
  } = useDriverUpload();
  
  // If the user is not an admin, don't render anything
  if (!isAdmin) {
    return null;
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && processingRef.current) {
        toast.info("Upload process is continuing in the background", {
          description: "Please keep this tab open until completion"
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="space-y-4">
      <UploadForm isUploading={isUploading} onFileSelect={handleFileUpload} />
      
      {isUploading && (
        <UploadProgress 
          progress={progress}
          currentItem={currentItem}
          totalItems={totalItems}
        />
      )}
      
      {uploadStats && <UploadResults stats={uploadStats} />}
    </div>
  );
};
