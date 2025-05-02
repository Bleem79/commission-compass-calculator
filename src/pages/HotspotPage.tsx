
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Home } from "lucide-react";

const HotspotPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoHome = () => {
    navigate('/home');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-6">
          <h1 className="text-3xl font-bold text-indigo-800">Hotspot</h1>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGoHome}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
            >
              <Home size={16} />
              Back to Home
            </Button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100 p-6">
          <h2 className="text-2xl font-semibold text-indigo-700 mb-4">Hotspot Information</h2>
          <p className="text-gray-700 mb-4">
            This page would contain information about hotspot areas for drivers.
          </p>
          
          <div className="mt-6">
            <p className="text-gray-700">
              Hotspot information and any relevant tools would be displayed here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotPage;
