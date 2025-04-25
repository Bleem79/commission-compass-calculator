
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { GuestLoginButton } from "@/components/auth/GuestLoginButton";

const Login = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Driver Commission Calculator
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to access your commission calculator
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter>
          <GuestLoginButton />
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
