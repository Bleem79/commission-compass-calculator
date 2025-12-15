import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Key, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DriverIncomeAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DriverIncomeAuthDialog = ({ isOpen, onClose }: DriverIncomeAuthDialogProps) => {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Authenticate using driver ID
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${driverId}@driver.temp`,
        password: password,
      });

      if (error) {
        setError("Invalid Driver ID or password");
        toast({
          title: "Authentication Failed",
          description: "Invalid Driver ID or password",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        toast({
          title: "Authentication Successful",
          description: "Redirecting to driver income page",
        });
        onClose();
        navigate("/driver-income");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("An unexpected error occurred");
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDriverId("");
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold text-gray-800">
            Driver Income Access
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 border-l-4 border-red-500">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="driverId" className="text-sm font-medium text-gray-700">
              Driver ID
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-5 w-5 text-rose-500" />
              <Input
                id="driverId"
                placeholder="Enter your Driver ID"
                className="pl-10 border-gray-300 focus:border-rose-500 focus:ring focus:ring-rose-200 transition-all"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="incomePassword" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 h-5 w-5 text-rose-500" />
              <Input
                id="incomePassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="pl-10 pr-10 border-gray-300 focus:border-rose-500 focus:ring focus:ring-rose-200 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-rose-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-md"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Access Income Data"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
