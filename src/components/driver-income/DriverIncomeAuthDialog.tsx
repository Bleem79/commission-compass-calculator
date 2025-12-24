import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Key, Eye, EyeOff, AlertCircle, ShieldX, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DriverIncomeAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to get user-friendly error messages
const getErrorMessage = (errorCode: string | undefined, errorMessage: string): { title: string; description: string; icon: 'credentials' | 'disabled' | 'notfound' | 'generic' } => {
  // Check for specific Supabase auth errors
  if (errorMessage?.includes('Invalid login credentials')) {
    return {
      title: "Wrong Password or Driver ID",
      description: "The Driver ID or password you entered is incorrect. Please check your credentials and try again.",
      icon: 'credentials'
    };
  }
  
  if (errorCode === 'invalid_credentials' || errorMessage?.includes('invalid_credentials')) {
    return {
      title: "Wrong Password or Driver ID",
      description: "The Driver ID or password you entered is incorrect. Please check your credentials and try again.",
      icon: 'credentials'
    };
  }

  if (errorMessage?.includes('Email not confirmed')) {
    return {
      title: "Account Not Verified",
      description: "Your account has not been verified. Please contact the administrator.",
      icon: 'generic'
    };
  }

  if (errorMessage?.includes('too many requests') || errorCode === 'over_request_rate_limit') {
    return {
      title: "Too Many Attempts",
      description: "You've made too many login attempts. Please wait a few minutes before trying again.",
      icon: 'generic'
    };
  }

  return {
    title: "Login Failed",
    description: errorMessage || "An error occurred during login. Please try again.",
    icon: 'generic'
  };
};

export const DriverIncomeAuthDialog = ({ isOpen, onClose }: DriverIncomeAuthDialogProps) => {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<{ title: string; description: string; icon: 'credentials' | 'disabled' | 'notfound' | 'generic' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation
    const trimmedDriverId = driverId.trim();
    if (!trimmedDriverId) {
      setError({
        title: "Driver ID Required",
        description: "Please enter your Driver ID to continue.",
        icon: 'generic'
      });
      setLoading(false);
      return;
    }

    if (!password) {
      setError({
        title: "Password Required",
        description: "Please enter your password to continue.",
        icon: 'generic'
      });
      setLoading(false);
      return;
    }

    if (password.length < 4) {
      setError({
        title: "Invalid Password",
        description: "Password must be at least 4 characters long.",
        icon: 'credentials'
      });
      setLoading(false);
      return;
    }

    try {
      // Authenticate using driver ID
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: `${trimmedDriverId}@driver.temp`,
        password: password,
      });

      if (authError) {
        const errorInfo = getErrorMessage(authError.code, authError.message);
        setError(errorInfo);
        toast({
          title: errorInfo.title,
          description: errorInfo.description,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        // Check if driver status is enabled - check by user_id OR by driver_id
        let credentials = null;
        
        // First try by user_id
        const { data: credByUserId } = await supabase
          .from('driver_credentials')
          .select('status, driver_id')
          .eq('user_id', data.user.id)
          .maybeSingle();
        
        if (credByUserId) {
          credentials = credByUserId;
        } else {
          // Fallback: check by driver_id (for cases where user_id was not set)
          const { data: credByDriverId } = await supabase
            .from('driver_credentials')
            .select('status, driver_id, id')
            .eq('driver_id', trimmedDriverId)
            .maybeSingle();
          
          if (credByDriverId) {
            credentials = credByDriverId;
            // Update the credential record to link user_id for future logins
            await supabase
              .from('driver_credentials')
              .update({ user_id: data.user.id })
              .eq('id', credByDriverId.id);
          }
        }

        if (!credentials) {
          await supabase.auth.signOut();
          const errorInfo = {
            title: "Driver Not Found",
            description: "Your driver account was not found in the system. Please contact the administrator.",
            icon: 'notfound' as const
          };
          setError(errorInfo);
          toast({
            title: errorInfo.title,
            description: errorInfo.description,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        if (credentials.status === 'disabled') {
          await supabase.auth.signOut();
          const errorInfo = {
            title: "Account Disabled",
            description: "Your driver account has been disabled. Please contact the administrator for assistance.",
            icon: 'disabled' as const
          };
          setError(errorInfo);
          toast({
            title: errorInfo.title,
            description: errorInfo.description,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Welcome!",
          description: `Successfully logged in as Driver ${credentials.driver_id}`,
        });
        onClose();
        navigate("/driver-income");
      }
    } catch (err) {
      console.error("Auth error:", err);
      const errorInfo = {
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        icon: 'generic' as const
      };
      setError(errorInfo);
      toast({
        title: errorInfo.title,
        description: errorInfo.description,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDriverId("");
    setPassword("");
    setError(null);
    onClose();
  };

  const getErrorIcon = () => {
    if (!error) return null;
    switch (error.icon) {
      case 'credentials':
        return <Key className="h-5 w-5 text-red-500 flex-shrink-0" />;
      case 'disabled':
        return <ShieldX className="h-5 w-5 text-red-500 flex-shrink-0" />;
      case 'notfound':
        return <UserX className="h-5 w-5 text-red-500 flex-shrink-0" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />;
    }
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
            <div className="rounded-md bg-red-50 p-4 border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                {getErrorIcon()}
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{error.title}</p>
                  <p className="text-sm text-red-600 mt-1">{error.description}</p>
                </div>
              </div>
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
