
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export const GuestLoginButton = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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
        toast({
          title: "Guest Login Successful",
          description: "Welcome! You're logged in as a guest.",
        });
        navigate("/dashboard");
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
      Continue as Guest
    </Button>
  );
};
