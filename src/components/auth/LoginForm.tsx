
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogIn, UserCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get the return path from location state, or default to home
  const from = location.state?.from || "/home";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Try to log in using the identifier (could be email or driver ID)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier.includes('@') ? identifier : `${identifier}@driver.temp`, // Use temp email format for ID login
        password: password,
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

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-500">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="identifier">Email or Driver ID</Label>
        <div className="relative">
          <UserCircle className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input
            id="identifier"
            placeholder="Enter email or driver ID"
            className="pl-10"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : (
          <>
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </>
        )}
      </Button>
    </form>
  );
};
