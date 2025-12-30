
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Key, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Get the return path from location state, or default to home
  const from = location.state?.from || "/home";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalizedIdentifier = identifier.trim();
    const normalizedPassword = password.trim();

    try {
      // Try to log in using the identifier (could be email or driver ID)
      const email = normalizedIdentifier.includes("@")
        ? normalizedIdentifier.toLowerCase()
        : `${normalizedIdentifier}@driver.temp`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: normalizedPassword,
      });

      if (error) {
        setError(error.message);
        toast({
          title: "Login Error",
          description: error.message,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log("Login successful with user ID:", data.user.id);
        toast({
          title: "Login Successful",
          description: "You are now logged in",
        });
        
        // Navigate to home page after login
        navigate("/home");
      } else {
        // This shouldn't happen, but just in case
        setError("Login successful but no user data received");
        toast({
          title: "Login Error",
          description: "An unexpected error occurred",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred");
      toast({
        title: "Login Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-500 border-l-4 border-red-500">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="identifier" className="text-sm font-medium text-gray-700">Email or Driver ID</Label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-5 w-5 text-purple-500" />
          <Input
            id="identifier"
            placeholder="Enter email or driver ID"
            className="pl-10 border-gray-300 focus:border-purple-500 focus:ring focus:ring-purple-200 transition-all"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
        <div className="relative">
          <Key className="absolute left-3 top-2.5 h-5 w-5 text-purple-500" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            className="pl-10 pr-10 border-gray-300 focus:border-purple-500 focus:ring focus:ring-purple-200 transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button 
            type="button" 
            onClick={toggleShowPassword} 
            className="absolute right-3 top-2.5 text-gray-400 hover:text-purple-600 transition-colors"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <Button 
        type="submit" 
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md"
        disabled={loading}
      >
        <div className="flex items-center justify-center">
          {loading ? "Signing in..." : (
            <>
              <span className="mr-2">Sign In</span>
            </>
          )}
        </div>
      </Button>
    </form>
  );
};
