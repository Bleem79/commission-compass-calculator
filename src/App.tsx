import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { lazy, Suspense, useEffect, memo } from "react";
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
const PageLoader = memo(() => (
  <div className="min-h-screen w-full flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
));
PageLoader.displayName = "PageLoader";

// Stable QueryClient instance outside component to prevent re-creation on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes - reduces refetches
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={300}>
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

// Layout wrapper for protected routes with sidebar
const ProtectedLayout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full">
        <Outlet />
      </div>
    </SidebarProvider>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<AuthRoute />} />
      <Route path="/" element={<Index />} />
      <Route path="/install" element={<InstallPage />} />

      {/* All protected routes share a single layout */}
      <Route element={<ProtectedLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/commission-table" element={<CommissionTable />} />
        <Route path="/info" element={<InfoPage />} />
        <Route path="/m-fuel" element={<MFuelPage />} />
        <Route path="/hotspot" element={<HotspotPage />} />
        <Route path="/cng-location" element={<CNGLocationPage />} />
        <Route path="/driver-income" element={<DriverIncomePage />} />
        <Route path="/driver-management" element={<DriverManagementPage />} />
        <Route path="/driver-absent-fine" element={<DriverAbsentFinePage />} />
        <Route path="/driver-portal" element={<DriverPortalPage />} />
        <Route path="/driver-target-trips" element={<DriverTargetTripsPage />} />
        <Route path="/driver-absent-fine-view" element={<DriverAbsentFineViewPage />} />
        <Route path="/driver-request" element={<DriverRequestPage />} />
        <Route path="/driver-warning-letter" element={<DriverWarningLetterPage />} />
        <Route path="/target-trips-upload" element={<TargetTripsUploadPage />} />
        <Route path="/warning-letters-upload" element={<WarningLettersUploadPage />} />
        <Route path="/admin-requests" element={<AdminRequestsPage />} />
        <Route path="/driver-activity-logs" element={<DriverActivityLogsPage />} />
        <Route path="/driver-master-file" element={<DriverMasterFilePage />} />
        <Route path="/revenue-controller-portal" element={<RevenueControllerPortalPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

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

export default App;
