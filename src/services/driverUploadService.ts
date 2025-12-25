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

async function formatFunctionsInvokeError(err: any): Promise<string> {
  // supabase.functions.invoke returns error objects from @supabase/functions-js
  // FunctionsHttpError.context is the raw Response.
  try {
    const context = err?.context;
    if (err?.name === "FunctionsHttpError" && context && typeof context.text === "function") {
      const status = context.status;
      const contentType = String(context.headers?.get?.("Content-Type") ?? "");
      const raw = await context.text();

      if (contentType.includes("application/json")) {
        try {
          const parsed = JSON.parse(raw);
          const message = parsed?.error ?? parsed?.message ?? raw;
          return `HTTP ${status}: ${message}`;
        } catch {
          return `HTTP ${status}: ${raw}`;
        }
      }

      return `HTTP ${status}: ${raw || err?.message || "Edge Function error"}`;
    }
  } catch {
    // ignore parsing failures
  }

  return err?.message || "Failed to upload driver credentials";
}

export const uploadDriverCredential = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<DriverUploadResult> => {
  const drivers = await processCSVFile(file);

  if (!drivers || drivers.length === 0) {
    throw new Error("No data found in the uploaded file");
  }

  const total = drivers.length;
  const CHUNK_SIZE = 100;

  const combined: DriverUploadResult = {
    total,
    success: [],
    errors: [],
  };

  onProgress?.({ current: 0, total, currentDriverId: "Starting…" });

  let processed = 0;

  for (let i = 0; i < drivers.length; i += CHUNK_SIZE) {
    const chunk = drivers.slice(i, i + CHUNK_SIZE);

    const firstId = chunk[0]?.driverId ?? "…";
    onProgress?.({ current: processed, total, currentDriverId: `Uploading ${firstId}…` });

    const { data, error } = await supabase.functions.invoke("driver-credentials-bulk", {
      body: { drivers: chunk, replaceExisting: i === 0 },
    });

    if (error) {
      throw new Error(await formatFunctionsInvokeError(error));
    }

    const chunkResult = data as DriverUploadResult;

    combined.success.push(...(chunkResult?.success ?? []));
    combined.errors.push(...(chunkResult?.errors ?? []));

    processed += chunk.length;

    const lastId = chunk[chunk.length - 1]?.driverId ?? "…";
    onProgress?.({ current: Math.min(processed, total), total, currentDriverId: `Done ${lastId}` });
  }

  onProgress?.({ current: total, total, currentDriverId: "Done" });
  return combined;
};
