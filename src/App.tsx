
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";
import CommissionTable from "./pages/CommissionTable";
import InfoPage from "./pages/InfoPage";
import MFuelPage from "./pages/MFuelPage";
import HotspotPage from "./pages/HotspotPage";
import CNGLocationPage from "./pages/CNGLocationPage";
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
      <Route path="/login" element={<AuthRoute />} />
      <Route 
        path="/" 
        element={<Navigate to="/home" replace />} 
      />
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <HomePage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
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
      <Route 
        path="/info" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <InfoPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/m-fuel" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <MFuelPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/hotspot" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <HotspotPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/cng-location" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <CNGLocationPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Add an AuthRoute component to handle redirecting authenticated users away from login
const AuthRoute = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  return <Login />;
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  useEffect(() => {
    console.log("ProtectedRoute check - Auth status:", isAuthenticated);
  }, [isAuthenticated]);
  
  if (!isAuthenticated) {
    console.log("Not authenticated, redirecting to login from", location.pathname);
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  return children;
};

export default App;
