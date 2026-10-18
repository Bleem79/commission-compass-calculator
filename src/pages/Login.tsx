import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { GuestLoginButton } from "@/components/auth/GuestLoginButton";
import amanLogo from "@/assets/aman-logo.png";

const Login = () => {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#eef2f6]">
      {/* Navy header band */}
      <div className="w-full bg-[#16324f] pt-14 pb-24 flex flex-col items-center shadow-md">
        <div className="p-3 rounded-2xl bg-white/10 border border-white/20 mb-4">
          <img src={amanLogo} alt="Aman Taxi Logo" className="h-14 w-auto" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          MyAman <span className="text-sky-300">WebApp</span>
        </h1>
        <p className="text-sm text-white/60 mt-1">Connect to your driver account</p>
      </div>

      {/* White login card overlapping the header */}
      <Card className="w-full max-w-md shadow-xl border border-slate-200 bg-white relative z-10 mx-4 -mt-14 rounded-2xl">
        <CardHeader className="space-y-1 text-center pb-2 pt-8">
          <CardTitle className="text-xl font-bold tracking-tight text-slate-800">
            Welcome Back
          </CardTitle>
          <p className="text-sm text-slate-500 px-6">
            Sign in to access your commission calculator
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="my-2 flex justify-center">
            <div className="h-px w-32 bg-slate-200"></div>
          </div>
          <LoginForm />
        </CardContent>
        <CardFooter />
      </Card>
    </div>
  );
};

export default Login;
