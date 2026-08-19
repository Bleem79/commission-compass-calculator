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

// Retry dynamic imports; if a chunk is stale (after a new deploy), reload once to get fresh assets.
const lazyRetry = <T extends { default: React.ComponentType<any> }>(
  importer: () => Promise<T>
) =>
  lazy(async () => {
    try {
      const mod = await importer();
      sessionStorage.removeItem("chunk-reload-attempted");
      return mod;
    } catch (err) {
      const key = "chunk-reload-attempted";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise<T>(() => {});
      }
      throw err;
    }
  });

// Lazy load all page components for code splitting
const Login = lazyRetry(() => import("./pages/Login"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const HomePage = lazyRetry(() => import("./pages/HomePage"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const CommissionTable = lazyRetry(() => import("./pages/CommissionTable"));
const InfoPage = lazyRetry(() => import("./pages/InfoPage"));
const MFuelPage = lazyRetry(() => import("./pages/MFuelPage"));
const HotspotPage = lazyRetry(() => import("./pages/HotspotPage"));
const CNGLocationPage = lazyRetry(() => import("./pages/CNGLocationPage"));
const DriverIncomePage = lazyRetry(() => import("./pages/DriverIncomePage"));
const DriverManagementPage = lazyRetry(() => import("./pages/DriverManagementPage"));
const DriverAbsentFinePage = lazyRetry(() => import("./pages/DriverAbsentFinePage"));
const DriverPortalPage = lazyRetry(() => import("./pages/DriverPortalPage"));
const DriverTargetTripsPage = lazyRetry(() => import("./pages/DriverTargetTripsPage"));
const DriverAbsentFineViewPage = lazyRetry(() => import("./pages/DriverAbsentFineViewPage"));
const DriverRequestPage = lazyRetry(() => import("./pages/DriverRequestPage"));
const DriverWarningLetterPage = lazyRetry(() => import("./pages/DriverWarningLetterPage"));
const TargetTripsUploadPage = lazyRetry(() => import("./pages/TargetTripsUploadPage"));
const WarningLettersUploadPage = lazyRetry(() => import("./pages/WarningLettersUploadPage"));
const AdminRequestsPage = lazyRetry(() => import("./pages/AdminRequestsPage"));
const InstallPage = lazyRetry(() => import("./pages/InstallPage"));
const DriverActivityLogsPage = lazyRetry(() => import("./pages/DriverActivityLogsPage"));
const DriverMasterFilePage = lazyRetry(() => import("./pages/DriverMasterFilePage"));
const RevenueControllerPortalPage = lazyRetry(() => import("./pages/RevenueControllerPortalPage"));
const DriverEntryPassPage = lazyRetry(() => import("./pages/DriverEntryPassPage"));
const DriverSurveyPage = lazyRetry(() => import("./pages/DriverSurveyPage"));
const AdminSurveyPage = lazyRetry(() => import("./pages/AdminSurveyPage"));
const DriverYangoPage = lazyRetry(() => import("./pages/DriverYangoPage"));
const AdminYangoPage = lazyRetry(() => import("./pages/AdminYangoPage"));
const AdminEntryPassPage = lazyRetry(() => import("./pages/AdminEntryPassPage"));
const VideoTutorialsPage = lazyRetry(() => import("./pages/VideoTutorialsPage"));
const PRDPage = lazyRetry(() => import("./pages/PRDPage"));
const SystemGuidePage = lazyRetry(() => import("./pages/SystemGuidePage"));
const TotalOutstandingPage = lazyRetry(() => import("./pages/TotalOutstandingPage"));
const TotalBalanceKPIPage = lazyRetry(() => import("./pages/TotalBalanceKPIPage"));
const CalendarEventsUploadPage = lazyRetry(() => import("./pages/CalendarEventsUploadPage"));
const DriverCalendarEventsPage = lazyRetry(() => import("./pages/DriverCalendarEventsPage"));
const DriverBadgePage = lazyRetry(() => import("./pages/DriverBadgePage"));
const Index = lazyRetry(() => import("./pages/Index"));

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
  const { isPageBlocked, loading } = usePagePermissions();
  const { isAdmin, user } = useAuth();

  // Admins bypass all page restrictions
  if (isAdmin) return <>{children}</>;
  
  // Drivers/guests don't use page permissions
  if (user?.role === 'driver' || user?.role === 'guest') return <>{children}</>;

  // Wait for permissions to load before rendering
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isPageBlocked(pageKey)) {
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
        <Route path="/driver-survey" element={<DriverSurveyPage />} />
        <Route path="/admin-survey" element={<PageGuard pageKey="admin-survey"><AdminSurveyPage /></PageGuard>} />
        <Route path="/driver-yango" element={<DriverYangoPage />} />
        <Route path="/admin-yango" element={<PageGuard pageKey="admin-yango"><AdminYangoPage /></PageGuard>} />
        <Route path="/admin-entry-pass" element={<PageGuard pageKey="admin-entry-pass"><AdminEntryPassPage /></PageGuard>} />
        <Route path="/video-tutorials" element={<PageGuard pageKey="video-tutorials"><VideoTutorialsPage /></PageGuard>} />
        <Route path="/prd" element={<PRDPage />} />
        <Route path="/system-guide" element={<SystemGuidePage />} />
        <Route path="/total-outstanding" element={<PageGuard pageKey="total-outstanding"><TotalOutstandingPage /></PageGuard>} />
        <Route path="/total-balance-kpi" element={<PageGuard pageKey="total-balance-kpi"><TotalBalanceKPIPage /></PageGuard>} />
        <Route path="/calendar-events-upload" element={<PageGuard pageKey="calendar-events-upload"><CalendarEventsUploadPage /></PageGuard>} />
        <Route path="/driver-calendar-events" element={<DriverCalendarEventsPage />} />
        <Route path="/driver-badge" element={<PageGuard pageKey="driver-badge"><DriverBadgePage /></PageGuard>} />
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
