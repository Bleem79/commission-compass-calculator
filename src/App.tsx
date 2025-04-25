
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import CommissionTable from "./pages/CommissionTable";

// Create a new QueryClient instance inside the component
// to ensure it's created in the proper React context
const App = () => {
  const queryClient = new QueryClient();

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
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default App;
