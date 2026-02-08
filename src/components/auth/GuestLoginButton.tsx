import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { UserRound } from "lucide-react";

export function GuestLoginButton() {

  const handleGuestLogin = () => {
    toast({
      title: "Login Required",
      description: "Enter your driver ID No. and Password",
    });
  };

  return (
    <Button
      variant="outline"
      onClick={handleGuestLogin}
      className="w-full border-2 border-muted bg-muted/30 text-muted-foreground font-medium transition-all flex items-center justify-center opacity-60 cursor-not-allowed"
    >
      <div className="flex items-center gap-2">
        <UserRound className="h-4 w-4" />
        Continue as Guest
      </div>
    </Button>
  );
}
