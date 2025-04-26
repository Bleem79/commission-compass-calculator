
import { Progress } from "@/components/ui/progress";

interface UploadProgressProps {
  progress: number;
  currentItem?: number;
  totalItems?: number;
}

export const UploadProgress = ({ progress, currentItem, totalItems }: UploadProgressProps) => {
  return (
    <div className="mt-3">
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between text-sm text-muted-foreground mt-1">
        <span>{progress}% Complete</span>
        {currentItem !== undefined && totalItems !== undefined && (
          <span>Processing: {currentItem}/{totalItems}</span>
        )}
      </div>
    </div>
  );
};
