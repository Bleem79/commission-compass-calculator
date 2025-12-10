
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ListCheck, 
  Calculator, 
  Bell, 
  Info, 
  Percent, 
  Wifi,
  MapPin
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/calculator/UserProfile";
import { AdminMessages } from "@/components/messages/AdminMessages";
import { toast } from "@/hooks/use-toast";

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check authentication status and redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("Not authenticated in HomePage, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    setIsLoggingOut(true);
    try {
      console.log("Starting logout process...");
      await logout();
      
      // Force a page refresh after logout to clear any stale state
      console.log("Refreshing page after logout");
      window.location.href = "/login";
    } catch (error) {
      console.error("Error in handleLogout:", error);
      toast({
        title: "Logout Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      setIsLoggingOut(false);
      
      // Even if there's an error, force refresh to login page
      window.location.href = "/login";
    }
  }, [logout, isLoggingOut]);

  // Render memoized content to prevent unnecessary re-renders
  const renderFeatureButtons = useCallback(() => (
    <>
      {/* Feature Buttons - First Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mt-4 sm:mt-6 mb-4 sm:mb-8">
        {/* 1. Commission Percentage Calculator */}
        <Card 
          className="bg-gradient-to-br from-indigo-400 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer h-28 sm:h-40"
          onClick={() => navigate("/dashboard")}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-3 sm:p-6">
            <Calculator size={32} className="mb-2 sm:mb-3 sm:w-12 sm:h-12" />
            <h2 className="text-xs sm:text-lg font-medium text-center leading-tight">Commission Calculator</h2>
          </CardContent>
        </Card>
        
        {/* 2. View Commission Table */}
        <Card 
          className="bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer h-28 sm:h-40"
          onClick={() => navigate("/commission-table")}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-3 sm:p-6">
            <ListCheck size={32} className="mb-2 sm:mb-3 sm:w-12 sm:h-12" />
            <h2 className="text-xs sm:text-lg font-medium text-center leading-tight">Commission Table</h2>
          </CardContent>
        </Card>
        
        {/* 3. M-fuel % */}
        <Card 
          className="bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer h-28 sm:h-40 col-span-2 md:col-span-1"
          onClick={() => navigate("/m-fuel")}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-3 sm:p-6">
            <Percent size={32} className="mb-2 sm:mb-3 sm:w-12 sm:h-12" />
            <h2 className="text-xs sm:text-lg font-medium text-center leading-tight">M-fuel %</h2>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        {/* 4. Hotspot */}
        <Card 
          className="bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer h-28 sm:h-40"
          onClick={() => navigate("/hotspot")}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-3 sm:p-6">
            <Wifi size={32} className="mb-2 sm:mb-3 sm:w-12 sm:h-12" />
            <h2 className="text-xs sm:text-lg font-medium text-center leading-tight">Hotspot</h2>
          </CardContent>
        </Card>
        
        {/* 5. Info */}
        <Card 
          className="bg-gradient-to-br from-pink-400 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer h-28 sm:h-40"
          onClick={() => navigate("/info")}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-3 sm:p-6">
            <Info size={32} className="mb-2 sm:mb-3 sm:w-12 sm:h-12" />
            <h2 className="text-xs sm:text-lg font-medium text-center leading-tight">Info</h2>
          </CardContent>
        </Card>
        
        {/* 6. Notifications */}
        <Card 
          className="bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer h-28 sm:h-40 relative"
          onClick={() => setIsMessagesOpen(true)}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-3 sm:p-6">
            <Bell size={32} className="mb-2 sm:mb-3 sm:w-12 sm:h-12" />
            <h2 className="text-xs sm:text-lg font-medium text-center leading-tight">Notifications</h2>
          </CardContent>
        </Card>

        {/* 7. CNG Location */}
        <Card 
          className="bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer h-28 sm:h-40"
          onClick={() => navigate("/cng-location")}
        >
          <CardContent className="flex flex-col items-center justify-center h-full p-3 sm:p-6">
            <MapPin size={32} className="mb-2 sm:mb-3 sm:w-12 sm:h-12" />
            <h2 className="text-xs sm:text-lg font-medium text-center leading-tight">CNG Location</h2>
          </CardContent>
        </Card>
      </div>
    </>
  ), [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="w-full flex flex-row items-center justify-between gap-2 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold text-indigo-800">
            Driver Portal
          </h1>
          <div className="flex items-center gap-2 sm:gap-4">
            {user?.role && (
              <span className="text-xs sm:text-base text-slate-600 hidden sm:inline">
                Role: {user.role}
              </span>
            )}
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`flex items-center gap-1 sm:gap-2 ${isLoggingOut ? 'bg-gray-400' : 'bg-red-500 hover:bg-red-600'} text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors`}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>

        {/* User Profile */}
        {user && (
          <UserProfile 
            email={user.email} 
            username={user.username} 
            role={user.role}
          />
        )}

        {/* Feature Buttons */}
        {renderFeatureButtons()}

        {/* Footer */}
        <footer className="mt-8 sm:mt-12 flex flex-col items-center justify-center gap-2 py-4 border-t border-gray-200">
          <img 
            src="/lovable-uploads/aman-logo-footer.png" 
            alt="Aman Taxi Sharjah" 
            className="h-8 sm:h-10 object-contain"
          />
          <p className="text-xs sm:text-sm text-gray-500">All Rights Reserved</p>
        </footer>
      </div>

      {/* Messages Dialog */}
      <AdminMessages
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
      />
    </div>
  );
};

export default HomePage;
