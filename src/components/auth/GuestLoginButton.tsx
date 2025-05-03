import { Button } from "@/components/ui/button";
import { signInAsGuest } from "@/integrations/supabase/auth-utils";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const GuestLoginButton = () => {
  const navigate = useNavigate();

  const handleGuestLogin = async () => {
    try {
      await signInAsGuest();
      navigate("/home");
    } catch (error) {
      console.error("Guest login failed:", error);
      // Handle error appropriately (e.g., display an error message)
    }
  };

  return (
    <Button
      variant="secondary"
      className="w-full justify-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-sm"
      onClick={handleGuestLogin}
    >
      <Sparkles className="h-4 w-4" />
      Continue as Guest
    </Button>
  );
};
