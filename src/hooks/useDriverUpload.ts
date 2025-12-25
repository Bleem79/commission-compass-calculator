
import { useState, useRef, useEffect } from "react";
import { uploadDriverCredential } from "@/services/driverUploadService";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UploadStats {
  total: number;
  success: number;
  failed: number;
  errors?: Array<{ driverId: string; error: string }>;
}

export const useDriverUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const processingRef = useRef<boolean>(false);
  const { session, refreshSession } = useAuth();

  const resetStats = () => {
    setUploadStats(null);
    setProgress(0);
    setCurrentItem(0);
    setTotalItems(0);
  };

  // Setup a periodic session check during upload
  useEffect(() => {
    let sessionCheckInterval: number | undefined;
    
    if (isUploading && session) {
      // Check and refresh session every 30 seconds during upload
      sessionCheckInterval = window.setInterval(() => {
        refreshSession();
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [isUploading, session, refreshSession]);

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
      // Make sure to refresh session before starting
      await refreshSession();
      
      // Start upload process (chunked; progress updates from service)
      const results = await uploadDriverCredential(file, (p) => {
        setTotalItems(p.total);
        setCurrentItem(p.current);
        setProgress(p.total > 0 ? Math.round((p.current / p.total) * 100) : 0);
      });
      
      // Ensure session is still valid after uploads complete
      await refreshSession();
      
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
      
      // Make sure to refresh the session even if there's an error
      await refreshSession();
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
