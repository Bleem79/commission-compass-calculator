
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Home } from "lucide-react";

const InfoPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-6">
          <h1 className="text-3xl font-bold text-indigo-800">Information</h1>
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
          <h2 className="text-2xl font-semibold text-indigo-700 mb-4">Driver Information</h2>
          <p className="text-gray-700 mb-4">
            This page contains important information for drivers.
          </p>
          
          <div className="space-y-4 mt-6">
            <h3 className="text-xl font-semibold text-indigo-600">Company Policies</h3>
            <p className="text-gray-700">
              Details about company policies would be displayed here.
            </p>
            
            <h3 className="text-xl font-semibold text-indigo-600">Contact Information</h3>
            <p className="text-gray-700">
              Contact details for support would be displayed here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPage;
