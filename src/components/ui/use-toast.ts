import { toast } from "sonner";

// Re-export for backward compatibility
export { toast };
// This component is no longer needed with Sonner
// but keeping the export for compatibility
export const useToast = () => {
  return {
    toast,
    dismiss: () => {}
  };
};
