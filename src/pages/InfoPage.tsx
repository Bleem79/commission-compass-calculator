import { useAuth } from "@/contexts/AuthContext";
import { DocumentCategory } from "@/components/documents/DocumentCategory";
import { PageLayout } from "@/components/shared/PageLayout";
import { Info } from "lucide-react";

const InfoPage = () => {
  const { user } = useAuth();

  return (
    <PageLayout
      title="Information"
      icon={<Info className="h-6 w-6" />}
      maxWidth="4xl"
      gradient="from-white via-indigo-50 to-purple-100"
    >
      <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-6">
        {(user?.role === "admin" || user?.role === "guest") && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold border-b border-indigo-100 pb-2">
              Documents
            </h3>
            <DocumentCategory title="Info" bucketName="info_documents" />
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default InfoPage;
