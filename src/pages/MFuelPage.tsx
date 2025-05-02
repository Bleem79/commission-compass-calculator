
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Home } from "lucide-react";
import { DocumentCategory } from "@/components/documents/DocumentCategory";

const MFuelPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-6">
          <h1 className="text-3xl font-bold text-indigo-800">M-fuel Percentage</h1>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGoHome}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
            >
              <Home size={16} />
              Back to Home
            </Button>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-6">
          <h2 className="text-2xl font-semibold text-indigo-700 mb-4">M-fuel Percentage Calculator</h2>
          <p className="text-gray-700 mb-4">
            This page would contain tools and information related to M-fuel percentages.
          </p>
          
          <div className="mt-6">
            <p className="text-gray-700">
              The M-fuel percentage calculator functionality would be implemented here.
            </p>
          </div>
          
          {(user?.role === "admin" || user?.role === "guest") && (
            <div className="mt-8 space-y-4">
              <h3 className="text-xl font-semibold border-b border-indigo-100 pb-2">
                Documents
              </h3>
              <DocumentCategory title="M-Fuel" bucketName="mfuel_documents" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MFuelPage;
