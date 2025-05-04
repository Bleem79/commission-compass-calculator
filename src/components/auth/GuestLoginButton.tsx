
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { signInAsGuest } from "@/integrations/supabase/auth-utils";
import { toast } from "@/hooks/use-toast";

export function GuestLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGuestLogin = async () => {
    setIsLoading(true);
    
    try {
      const result = await signInAsGuest();
      
      if (result.error) {
        console.error("Guest login error:", result.error);
        toast({
          title: "Guest Login Error",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Guest Login Successful",
        description: "You're now logged in as a guest",
      });

      // Navigate to home page
      navigate("/home");
    } catch (error) {
      console.error("Unexpected guest login error:", error);
      toast({
        title: "Guest Login Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleGuestLogin}
      disabled={isLoading}
      className="w-full border border-gray-200 hover:bg-gray-50 hover:text-purple-700 transition-all flex items-center justify-center"
    >
      <div className="flex items-center">
        {isLoading ? "Signing in..." : "Continue as Guest"}
      </div>
    </Button>
  );
}
