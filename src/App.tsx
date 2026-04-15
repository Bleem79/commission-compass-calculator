import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PagePermissionsProvider, usePagePermissions } from "./contexts/PagePermissionsContext";
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
const DriverEntryPassPage = lazy(() => import("./pages/DriverEntryPassPage"));
const AdminEntryPassPage = lazy(() => import("./pages/AdminEntryPassPage"));
const VideoTutorialsPage = lazy(() => import("./pages/VideoTutorialsPage"));
const PRDPage = lazy(() => import("./pages/PRDPage"));
const SystemGuidePage = lazy(() => import("./pages/SystemGuidePage"));
const TotalOutstandingPage = lazy(() => import("./pages/TotalOutstandingPage"));
const TotalBalanceKPIPage = lazy(() => import("./pages/TotalBalanceKPIPage"));
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
    <PagePermissionsProvider>
      <SidebarProvider>
        <div className="min-h-screen w-full">
          <Outlet />
        </div>
      </SidebarProvider>
    </PagePermissionsProvider>
  );
};

// Guard component that checks page permissions
const PageGuard = ({ pageKey, children }: { pageKey: string; children: React.ReactNode }) => {
  const { isPageBlocked } = usePagePermissions();
  const { isAdmin } = useAuth();

  if (!isAdmin && isPageBlocked(pageKey)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
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
        <Route path="/dashboard" element={<PageGuard pageKey="dashboard"><Dashboard /></PageGuard>} />
        <Route path="/commission-table" element={<PageGuard pageKey="commission-table"><CommissionTable /></PageGuard>} />
        <Route path="/info" element={<PageGuard pageKey="info"><InfoPage /></PageGuard>} />
        <Route path="/m-fuel" element={<PageGuard pageKey="m-fuel"><MFuelPage /></PageGuard>} />
        <Route path="/hotspot" element={<PageGuard pageKey="hotspot"><HotspotPage /></PageGuard>} />
        <Route path="/cng-location" element={<PageGuard pageKey="cng-location"><CNGLocationPage /></PageGuard>} />
        <Route path="/driver-income" element={<PageGuard pageKey="driver-income"><DriverIncomePage /></PageGuard>} />
        <Route path="/driver-management" element={<PageGuard pageKey="driver-management"><DriverManagementPage /></PageGuard>} />
        <Route path="/driver-absent-fine" element={<PageGuard pageKey="driver-absent-fine"><DriverAbsentFinePage /></PageGuard>} />
        <Route path="/driver-portal" element={<DriverPortalPage />} />
        <Route path="/driver-target-trips" element={<DriverTargetTripsPage />} />
        <Route path="/driver-absent-fine-view" element={<DriverAbsentFineViewPage />} />
        <Route path="/driver-request" element={<DriverRequestPage />} />
        <Route path="/driver-warning-letter" element={<DriverWarningLetterPage />} />
        <Route path="/target-trips-upload" element={<PageGuard pageKey="target-trips-upload"><TargetTripsUploadPage /></PageGuard>} />
        <Route path="/warning-letters-upload" element={<PageGuard pageKey="warning-letters-upload"><WarningLettersUploadPage /></PageGuard>} />
        <Route path="/admin-requests" element={<PageGuard pageKey="admin-requests"><AdminRequestsPage /></PageGuard>} />
        <Route path="/driver-activity-logs" element={<PageGuard pageKey="driver-activity-logs"><DriverActivityLogsPage /></PageGuard>} />
        <Route path="/driver-master-file" element={<PageGuard pageKey="driver-master-file"><DriverMasterFilePage /></PageGuard>} />
        <Route path="/revenue-controller-portal" element={<RevenueControllerPortalPage />} />
        <Route path="/driver-entry-pass" element={<DriverEntryPassPage />} />
        <Route path="/admin-entry-pass" element={<PageGuard pageKey="admin-entry-pass"><AdminEntryPassPage /></PageGuard>} />
        <Route path="/video-tutorials" element={<PageGuard pageKey="video-tutorials"><VideoTutorialsPage /></PageGuard>} />
        <Route path="/prd" element={<PRDPage />} />
        <Route path="/system-guide" element={<SystemGuidePage />} />
        <Route path="/total-outstanding" element={<PageGuard pageKey="total-outstanding"><TotalOutstandingPage /></PageGuard>} />
        <Route path="/total-balance-kpi" element={<PageGuard pageKey="total-balance-kpi"><TotalBalanceKPIPage /></PageGuard>} />
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
