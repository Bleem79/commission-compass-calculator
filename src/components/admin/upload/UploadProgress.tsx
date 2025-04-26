
import { Progress } from "@/components/ui/progress";

interface UploadProgressProps {
  progress: number;
}

export const UploadProgress = ({ progress }: UploadProgressProps) => {
  return (
    <div className="mt-3">
      <Progress value={progress} className="h-2" />
      <p className="text-sm text-center mt-1">{progress}% Complete</p>
    </div>
  );
};
