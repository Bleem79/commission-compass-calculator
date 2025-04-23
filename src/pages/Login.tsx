
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogIn, UserCircle } from "lucide-react";

const Login = () => {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (success) {
      navigate("/dashboard");
    } else {
      setError("Invalid username or password");
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Commission Compass
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to access your commission calculator
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-500">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="Enter username"
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
              />
            </div>
            <Button type="submit" className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleGuestLogin}
          >
            Continue as Guest
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
