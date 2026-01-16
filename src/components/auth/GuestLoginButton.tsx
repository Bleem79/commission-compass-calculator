import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { signInAsGuest } from "@/integrations/supabase/auth-utils";
import { toast } from "@/hooks/use-toast";
import { UserRound } from "lucide-react";
import { useActivityLogger } from "@/hooks/useActivityLogger";

export function GuestLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { logActivity } = useActivityLogger();

  const handleGuestLogin = async () => {
    setIsLoading(true);
    
    try {
      const result = await signInAsGuest();
      
      // Check if the authentication succeeded
      if (!result.session || !result.user) {
        console.error("Guest login failed: No session or user returned");
        toast({
          title: "Guest Login Error",
          description: "Failed to login as guest",
          variant: "destructive",
        });
        return;
      }
      
      // Log guest login activity
      await logActivity(result.user.id, "Guest", "login");
      
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
      className="w-full border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 hover:border-purple-500 text-purple-700 font-medium transition-all flex items-center justify-center shadow-sm hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4" />
        {isLoading ? "Signing in..." : "Continue as Guest"}
      </div>
    </Button>
  );
}
