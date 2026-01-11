import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const DriverTargetTripsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleClose = () => {
    navigate("/driver-portal");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-emerald-50/50 to-teal-100/50 p-4 sm:p-6">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-4 right-4 z-10"
        onClick={handleClose}
      >
        <X className="h-6 w-6 text-muted-foreground hover:text-foreground" />
      </Button>
      
      <Button
        variant="outline"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background hover:bg-accent text-primary border-border"
        onClick={handleClose}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Portal</span>
      </Button>

      <div className="max-w-4xl mx-auto pt-16">
        <div className="flex items-center gap-3 mb-6">
          <Target className="h-8 w-8 text-emerald-600" />
          <h1 className="text-2xl font-bold text-foreground">Target Trips</h1>
        </div>

        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
          <p className="text-muted-foreground">
            Target trips tracking feature will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverTargetTripsPage;
