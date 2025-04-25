
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import CommissionTable from "./pages/CommissionTable";
import { useEffect } from "react";

// Create a new QueryClient instance inside the component
// to ensure it's created in the proper React context
const App = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30000,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen w-full bg-background">
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Separating the routes component to use the useAuth hook safely
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/" 
        element={<Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <Dashboard />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/commission-table" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <CommissionTable />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    console.log("ProtectedRoute check - Auth status:", isAuthenticated, "User:", user?.email);
  }, [isAuthenticated, user]);
  
  if (!isAuthenticated) {
    console.log("Not authenticated, redirecting to login from", location.pathname);
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  return children;
};

export default App;
