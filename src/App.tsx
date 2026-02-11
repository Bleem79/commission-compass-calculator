import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";

// Lazy load all page components for code splitting
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const HomePage = lazy(() => import("./pages/HomePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CommissionTable = lazy(() => import("./pages/CommissionTable"));
const InfoPage = lazy(() => import("./pages/InfoPage"));
const MFuelPage = lazy(() => import("./pages/MFuelPage"));
const HotspotPage = lazy(() => import("./pages/HotspotPage"));
const CNGLocationPage = lazy(() => import("./pages/CNGLocationPage"));
const DriverIncomePage = lazy(() => import("./pages/DriverIncomePage"));
const DriverManagementPage = lazy(() => import("./pages/DriverManagementPage"));
const DriverAbsentFinePage = lazy(() => import("./pages/DriverAbsentFinePage"));
const DriverPortalPage = lazy(() => import("./pages/DriverPortalPage"));
const DriverTargetTripsPage = lazy(() => import("./pages/DriverTargetTripsPage"));
const DriverAbsentFineViewPage = lazy(() => import("./pages/DriverAbsentFineViewPage"));
const DriverRequestPage = lazy(() => import("./pages/DriverRequestPage"));
const DriverWarningLetterPage = lazy(() => import("./pages/DriverWarningLetterPage"));
const TargetTripsUploadPage = lazy(() => import("./pages/TargetTripsUploadPage"));
const WarningLettersUploadPage = lazy(() => import("./pages/WarningLettersUploadPage"));
const AdminRequestsPage = lazy(() => import("./pages/AdminRequestsPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const DriverActivityLogsPage = lazy(() => import("./pages/DriverActivityLogsPage"));
const DriverMasterFilePage = lazy(() => import("./pages/DriverMasterFilePage"));
const RevenueControllerPortalPage = lazy(() => import("./pages/RevenueControllerPortalPage"));
const Index = lazy(() => import("./pages/Index"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

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
              <Suspense fallback={<PageLoader />}>
                <AppRoutes />
              </Suspense>
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
      <Route path="/" element={<Index />} />
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
      <Route 
        path="/driver-income" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <DriverIncomePage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/driver-management" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <DriverManagementPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/driver-absent-fine" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <DriverAbsentFinePage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/driver-portal" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <DriverPortalPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/driver-target-trips" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <DriverTargetTripsPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/driver-absent-fine-view" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <DriverAbsentFineViewPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/driver-request" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <DriverRequestPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/driver-warning-letter" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <DriverWarningLetterPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/target-trips-upload" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <TargetTripsUploadPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/warning-letters-upload" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <WarningLettersUploadPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin-requests" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <AdminRequestsPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/driver-activity-logs" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <DriverActivityLogsPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/driver-master-file" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <DriverMasterFilePage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/revenue-controller-portal" 
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <div className="min-h-screen w-full">
                <RevenueControllerPortalPage />
              </div>
            </SidebarProvider>
          </ProtectedRoute>
        } 
      />
      <Route path="/install" element={<InstallPage />} />
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
