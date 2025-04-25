
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogIn, UserCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const LoginForm = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        // Special case for admin user
        if (data.user.email === 'erico.ariata@outlook.com') {
          console.log("Admin user detected: erico.ariata@outlook.com");
          
          setUser({
            id: data.user.id,
            username: data.user.email,
            email: data.user.email,
            role: 'admin'
          });
          
          toast({
            title: "Admin Login Successful",
            description: "You have been logged in with administrative privileges.",
          });
          
          navigate("/dashboard");
          return;
        }
        
        // For other users, get role from database
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();
          
        if (roleError && roleError.code !== 'PGRST116') {
          console.error("Error fetching user role:", roleError);
        }

        const userRole = roleData?.role || 'guest';
        
        setUser({
          id: data.user.id,
          username: data.user.email || 'User',
          email: data.user.email,
          role: userRole
        });

        console.log("Login successful with role:", userRole);
        
        if (userRole === 'admin') {
          toast({
            title: "Admin Login Successful",
            description: "You have been logged in with administrative privileges.",
          });
        } else if (userRole === 'driver') {
          toast({
            title: "Driver Login Successful",
            description: "Welcome back!",
          });
        } else {
          toast({
            title: "Login Successful",
            description: "Welcome back!",
          });
        }
        
        navigate("/dashboard");
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
