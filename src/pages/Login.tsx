
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { GuestLoginButton } from "@/components/auth/GuestLoginButton";

const Login = () => {
  return (
    <div className="flex min-h-screen items-center justify-center relative">
      {/* Background image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/lovable-uploads/3a73efa1-5537-4d31-80e5-c6209b34c881.png')" }}
      >
        {/* Overlay to make text more readable */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      </div>
      
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm relative z-10">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-t-lg"></div>
        <CardHeader className="space-y-1 text-center pb-2">
          <div className="flex items-center justify-center gap-3">
            <img 
              src="/lovable-uploads/57e5e156-ac46-4329-bf55-4dd9e46b4a04.png" 
              alt="Aman Taxi Logo" 
              className="h-12 w-auto"
            />
            <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              MyAman WebApp
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground px-6">
            Sign in to access your commission calculator
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="my-2 flex justify-center">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>
          <LoginForm />
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="my-2 w-full flex items-center gap-3 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <span className="text-xs text-gray-400">OR</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>
          <GuestLoginButton />
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
