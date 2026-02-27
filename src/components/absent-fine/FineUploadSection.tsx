import React, { useRef } from "react";
import { Download, Upload, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface FineUploadSectionProps {
  isUploading: boolean;
  uploadProgress: number;
  totalFines: number;
  onDownloadTemplate: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAll: () => void;
}

export const FineUploadSection = ({
  isUploading, uploadProgress, totalFines,
  onDownloadTemplate, onFileUpload, onClearAll,
}: FineUploadSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="mb-6 bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-lg">Upload Fine Records</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={onDownloadTemplate}
            className="bg-white hover:bg-gray-50 border-green-200 text-green-700 hover:text-green-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          
          <input
            type="file"
            accept=".csv"
            onChange={onFileUpload}
            className="hidden"
            ref={fileInputRef}
            disabled={isUploading}
          />
          <Button
            variant="outline"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="bg-white hover:bg-gray-50 border-purple-200 text-purple-700 hover:text-purple-800"
          >
            {isUploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Upload CSV</>
            )}
          </Button>

          {totalFines > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="ml-auto">
                  <Trash2 className="h-4 w-4 mr-2" />Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Fine Records?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {totalFines} fine records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-white/60">Processing... {uploadProgress}%</p>
          </div>
        )}

        <p className="text-xs text-white/60">
          CSV columns: <strong>Fine No.</strong>, <strong>Driver ID</strong>, <strong>Vehicle Number</strong>, <strong>Fine Type</strong>, 
          <strong>Driver Reason</strong>, <strong>Start Date</strong>, <strong>End Date</strong>, <strong>Days</strong>, 
          <strong>Total Amount</strong>, <strong>Timestamp</strong>, <strong>Entered By</strong>
        </p>
      </CardContent>
    </Card>
  );
};
