
import { Button } from "@/components/ui/button";
import { signInAsGuest } from "@/integrations/supabase/auth-utils";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export const GuestLoginButton = () => {
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGuestLogin = async () => {
    if (isLoggingIn) return; // Prevent multiple clicks
    
    setIsLoggingIn(true);
    try {
      await signInAsGuest();
      toast({
        title: "Welcome, Guest!",
        description: "You've been signed in as a guest user",
      });
      // Add a small delay before navigating to ensure auth state has propagated
      setTimeout(() => {
        navigate("/home");
      }, 300);
    } catch (error) {
      console.error("Guest login failed:", error);
      toast({
        title: "Login Failed",
        description: "Unable to sign in as guest. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Button
      variant="secondary"
      className="w-full justify-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-sm"
      onClick={handleGuestLogin}
      disabled={isLoggingIn}
    >
      {isLoggingIn ? (
        <span className="inline-flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Signing in...
        </span>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Continue as Guest
        </>
      )}
    </Button>
  );
};
