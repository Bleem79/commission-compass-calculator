
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { generateUserTemplate } from "@/utils/excel/generateUserTemplate";

export const DownloadTemplateButton = () => {
  const downloadTemplate = () => {
    try {
      const template = generateUserTemplate();
      
      const blob = new Blob([template], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'driver_upload_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Template downloaded successfully", {
        description: "Use this template to prepare your driver data for upload"
      });
    } catch (error: any) {
      toast.error("Failed to download template", {
        description: error.message
      });
    }
  };

  return (
    <Button
      variant="outline"
      onClick={downloadTemplate}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      <span>Download Template</span>
    </Button>
  );
};
