
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const GuestLoginButton = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGuestLogin = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'guest@amantaximena.com',
        password: 'Gm@4445'
      });

      if (error) {
        console.error("Guest login error:", error);
        toast({
          title: "Guest Login Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (data.user) {
        console.log("Guest login successful with user ID:", data.user.id);
        toast({
          title: "Guest Login Successful",
          description: "Welcome! You're logged in as a guest.",
        });
        navigate("/home");
      }
    } catch (err) {
      console.error("Guest login error:", err);
      toast({
        title: "Guest Login Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full" 
      onClick={handleGuestLogin}
      disabled={loading}
    >
      {loading ? "Signing in..." : "Continue as Guest"}
    </Button>
  );
};
