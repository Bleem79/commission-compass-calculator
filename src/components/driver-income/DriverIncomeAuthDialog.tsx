import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Key, Eye, EyeOff, AlertCircle, ShieldX, UserX, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DriverIncomeAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Login attempt tracking configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'driver_login_attempts';

interface LoginAttempts {
  count: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

const getLoginAttempts = (): LoginAttempts => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { count: 0, lockedUntil: null, lastAttempt: 0 };
};

const setLoginAttempts = (attempts: LoginAttempts) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
};

const clearLoginAttempts = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Helper to get user-friendly error messages
const getErrorMessage = (errorCode: string | undefined, errorMessage: string): { title: string; description: string; icon: 'credentials' | 'disabled' | 'notfound' | 'generic' | 'locked' } => {
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
      icon: 'locked'
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
  const [error, setError] = useState<{ title: string; description: string; icon: 'credentials' | 'disabled' | 'notfound' | 'generic' | 'locked' } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS);

  // Check lockout status
  const checkLockoutStatus = useCallback(() => {
    const attempts = getLoginAttempts();
    const now = Date.now();

    if (attempts.lockedUntil && attempts.lockedUntil > now) {
      setIsLocked(true);
      setLockoutRemaining(Math.ceil((attempts.lockedUntil - now) / 1000));
      return true;
    } else if (attempts.lockedUntil && attempts.lockedUntil <= now) {
      // Lockout expired, reset attempts
      clearLoginAttempts();
      setIsLocked(false);
      setAttemptsRemaining(MAX_ATTEMPTS);
      return false;
    }

    setAttemptsRemaining(MAX_ATTEMPTS - attempts.count);
    return false;
  }, []);

  // Update lockout countdown
  useEffect(() => {
    if (!isOpen) return;
    
    checkLockoutStatus();
    
    const interval = setInterval(() => {
      if (isLocked) {
        const attempts = getLoginAttempts();
        const now = Date.now();
        
        if (attempts.lockedUntil && attempts.lockedUntil > now) {
          setLockoutRemaining(Math.ceil((attempts.lockedUntil - now) / 1000));
        } else {
          clearLoginAttempts();
          setIsLocked(false);
          setAttemptsRemaining(MAX_ATTEMPTS);
          setError(null);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isLocked, checkLockoutStatus]);

  const recordFailedAttempt = () => {
    const attempts = getLoginAttempts();
    const newCount = attempts.count + 1;
    
    if (newCount >= MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      setLoginAttempts({ count: newCount, lockedUntil, lastAttempt: Date.now() });
      setIsLocked(true);
      setLockoutRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
      setError({
        title: "Account Temporarily Locked",
        description: `Too many failed attempts. Please wait ${Math.ceil(LOCKOUT_DURATION_MS / 60000)} minutes before trying again.`,
        icon: 'locked'
      });
    } else {
      setLoginAttempts({ count: newCount, lockedUntil: null, lastAttempt: Date.now() });
      setAttemptsRemaining(MAX_ATTEMPTS - newCount);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if locked out
    if (checkLockoutStatus()) {
      setError({
        title: "Account Temporarily Locked",
        description: `Please wait ${formatTime(lockoutRemaining)} before trying again.`,
        icon: 'locked'
      });
      return;
    }

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
        recordFailedAttempt();
        const errorInfo = getErrorMessage(authError.code, authError.message);
        
        // Add remaining attempts info to error message
        if (!isLocked && attemptsRemaining > 1) {
          errorInfo.description += ` (${attemptsRemaining - 1} attempts remaining)`;
        }
        
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
        // Use secure database function to get and link driver credentials
        // This bypasses RLS to properly link user_id when it's null
        const { data: credentialRows, error: credError } = await supabase
          .rpc('get_driver_credentials', {
            p_driver_id: trimmedDriverId,
            p_user_id: data.user.id
          });

        const credentials = credentialRows && credentialRows.length > 0 ? credentialRows[0] : null;

        if (credError) {
          console.error("Error fetching credentials:", credError);
          await supabase.auth.signOut();
          recordFailedAttempt();
          const errorInfo = {
            title: "System Error",
            description: "Unable to verify driver credentials. Please try again later.",
            icon: 'generic' as const
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

        if (!credentials) {
          await supabase.auth.signOut();
          recordFailedAttempt();
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

        // Success! Clear login attempts
        clearLoginAttempts();
        
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
      case 'locked':
        return <Clock className="h-5 w-5 text-red-500 flex-shrink-0" />;
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
          {isLocked && (
            <div className="rounded-md bg-amber-50 p-4 border-l-4 border-amber-500">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Account Temporarily Locked</p>
                  <p className="text-sm text-amber-600 mt-1">
                    Try again in <span className="font-mono font-bold">{formatTime(lockoutRemaining)}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          {error && !isLocked && (
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
                disabled={loading || isLocked}
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
                disabled={loading || isLocked}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-rose-600 transition-colors"
                disabled={isLocked}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-md disabled:opacity-50"
            disabled={loading || isLocked}
          >
            {loading ? "Verifying..." : isLocked ? `Locked (${formatTime(lockoutRemaining)})` : "Access Income Data"}
          </Button>
          {!isLocked && attemptsRemaining < MAX_ATTEMPTS && attemptsRemaining > 0 && (
            <p className="text-xs text-center text-gray-500">
              {attemptsRemaining} login {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
