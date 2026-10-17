import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { GuestLoginButton } from "@/components/auth/GuestLoginButton";
import amanLogo from "@/assets/aman-logo.png";

const Login = () => {
  return (
    <div className="flex min-h-screen items-center justify-center relative bg-[#0a0a0a]">
      {/* Dark background with yellow glow accents */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border border-white/10 bg-[#161616] relative z-10 mx-4">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 rounded-t-lg"></div>
        <CardHeader className="space-y-1 text-center pb-2 pt-8">
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30">
              <img
                src={amanLogo}
                alt="Aman Taxi Logo"
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-white">
              MyAman <span className="text-yellow-400">WebApp</span>
            </CardTitle>
          </div>
          <p className="text-sm text-white/50 px-6">
            Sign in to access your commission calculator
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="my-2 flex justify-center">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent"></div>
          </div>
          <LoginForm />
        </CardContent>
        <CardFooter />

      </Card>
    </div>
  );
};

export default Login;
