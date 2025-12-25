
import { supabase } from "@/integrations/supabase/client";
import { processCSVFile } from "@/utils/csv/processCSVFile";

interface DriverUploadResult {
  success: Array<{ driverId: string }>;
  errors: Array<{ driverId: string; error: string }>;
  total: number;
}

interface UploadProgress {
  current: number;
  total: number;
  currentDriverId: string;
}

export const uploadDriverCredential = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<DriverUploadResult> => {
  const drivers = await processCSVFile(file);

  if (!drivers || drivers.length === 0) {
    throw new Error("No data found in the uploaded file");
  }

  // We now process server-side via an Edge Function (service role) because
  // the previous SQL function relied on auth.users_insert_raw(), which doesn't exist.
  onProgress?.({ current: 0, total: drivers.length, currentDriverId: "Starting…" });

  const { data, error } = await supabase.functions.invoke("driver-credentials-bulk", {
    body: { drivers, replaceExisting: true },
  });

  if (error) {
    throw new Error(error.message || "Failed to upload driver credentials");
  }

  // Keep UI consistent with previous behavior.
  onProgress?.({ current: drivers.length, total: drivers.length, currentDriverId: "Done" });

  return data as DriverUploadResult;
};
