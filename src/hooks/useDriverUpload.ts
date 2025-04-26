
import { useState, useRef } from "react";
import { uploadDriverCredential } from "@/services/driverUploadService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UploadStats {
  total: number;
  success: number;
  failed: number;
  errors?: Array<{ email: string; error: string }>;
}

export const useDriverUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const processingRef = useRef<boolean>(false);

  const resetStats = () => {
    setUploadStats(null);
    setProgress(0);
    setCurrentItem(0);
    setTotalItems(0);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resetStats();

    if (!file.name.match(/\.csv$/)) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsUploading(true);
    processingRef.current = true;
    
    try {
      // Store the current session to prevent any issues
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData.session;

      // Start upload process - this will use signUp instead of admin.createUser
      const results = await uploadDriverCredential(file);
      
      // Verify session is still valid after uploads complete
      const { data: newSessionData } = await supabase.auth.getSession();
      if (!newSessionData.session && currentSession) {
        console.warn("Session was lost during upload process, attempting to restore");
        // If needed, you could implement session recovery here
      }
      
      setTotalItems(results.total);
      setCurrentItem(results.total);
      setProgress(100);
      
      setUploadStats({
        total: results.total,
        success: results.success.length,
        failed: results.errors.length,
        errors: results.errors
      });

      if (results.success.length > 0) {
        toast.success(
          `Successfully created ${results.success.length} driver account${results.success.length > 1 ? 's' : ''}${
            results.errors.length > 0 ? ` (${results.errors.length} failed)` : ''
          }`
        );
      }

      if (results.errors.length > 0) {
        toast.error(`Failed to create ${results.errors.length} driver account${results.errors.length > 1 ? 's' : ''}`, {
          description: "Check the detailed errors below"
        });
      }

    } catch (error: any) {
      console.error("Error processing driver accounts:", error);
      toast.error("Failed to process driver accounts", {
        description: error.message || "Unknown error occurred"
      });
    } finally {
      setIsUploading(false);
      processingRef.current = false;
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return {
    isUploading,
    progress,
    currentItem,
    totalItems,
    uploadStats,
    processingRef,
    handleFileUpload,
    resetStats
  };
};
