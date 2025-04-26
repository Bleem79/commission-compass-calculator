
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface UploadProgressProps {
  progress: number;
  currentItem?: number;
  totalItems?: number;
}

export const UploadProgress = ({ progress, currentItem, totalItems }: UploadProgressProps) => {
  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Processing drivers...</span>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{progress}% Complete</span>
        {currentItem !== undefined && totalItems !== undefined && (
          <span>
            Processing: {currentItem}/{totalItems}
          </span>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground italic">
        Please keep this tab open until the process completes.
        This may take several minutes for large files.
      </p>
    </div>
  );
};
