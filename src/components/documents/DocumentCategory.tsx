
import React from "react";
import { DocumentViewer } from "./DocumentViewer";
import { useAuth } from "@/contexts/AuthContext";
import { FileImage, FileText } from "lucide-react";

interface DocumentCategoryProps {
  title: string;
  bucketName: string;
  autoDisplayForGuests?: boolean;
}

export const DocumentCategory: React.FC<DocumentCategoryProps> = ({ title, bucketName, autoDisplayForGuests = false }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isGuest = user?.role === "guest";

  return (
    <div className="mb-6 p-4 bg-white/80 backdrop-blur-sm rounded-lg border border-indigo-100">
      <h3 className="text-xl font-semibold text-indigo-700 mb-4">
        {title} Documents
      </h3>
      
      {(isAdmin || isGuest) ? (
        <DocumentViewer 
          bucketName={bucketName}
          title={title}
          icon={title === "PDF" ? <FileText className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}
          isAdmin={isAdmin}
          canView={isGuest || isAdmin}
          autoDisplay={autoDisplayForGuests && isGuest}
        />
      ) : (
        <p className="text-gray-500">
          You don't have permission to view these documents.
        </p>
      )}
    </div>
  );
};
