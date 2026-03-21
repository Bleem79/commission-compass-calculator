import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useCallback } from "react";
import { PageLayout } from "@/components/shared/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Users, Upload, MessageSquare, ClipboardCheck, Target,
  Ban, FileSpreadsheet, ShieldCheck, Settings2, Bell, Printer,
  LogIn, Home, Calculator, MapPin, Info, Smartphone, Video,
  ChevronRight, AlertTriangle, CheckCircle2, ArrowRight
} from "lucide-react";

const GuideSection = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <Card className="bg-white/5 backdrop-blur-sm border-white/10">
    <CardHeader className="pb-3">
      <CardTitle className="text-lg text-white flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="text-white/80 text-sm space-y-3">
      {children}
    </CardContent>
  </Card>
);

const StepList = ({ steps }: { steps: string[] }) => (
  <ol className="list-none space-y-2">
    {steps.map((step, i) => (
      <li key={i} className="flex items-start gap-2">
        <Badge variant="outline" className="border-blue-400/50 text-blue-300 bg-blue-500/10 min-w-[24px] justify-center mt-0.5 shrink-0">
          {i + 1}
        </Badge>
        <span>{step}</span>
      </li>
    ))}
  </ol>
);

const Tip = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2 bg-emerald-500/10 border border-emerald-400/20 rounded-lg p-3 mt-2">
    <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
    <span className="text-emerald-200 text-xs">{children}</span>
  </div>
);

const Warning = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-400/20 rounded-lg p-3 mt-2">
    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
    <span className="text-amber-200 text-xs">{children}</span>
  </div>
);

const SystemGuidePage = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (!isAdmin) {
      navigate("/home", { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  if (!isAdmin) return null;

  return (
    <PageLayout
      title="System Guide"
      icon={<BookOpen className="h-6 w-6" />}
      variant="dark"
      gradient="from-slate-900 via-emerald-900 to-slate-900"
      maxWidth="4xl"
      headerActions={
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 print:hidden"
        >
          <Printer className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      }
    >
      <div className="space-y-6 pb-10">
        {/* App Navigation Overview */}
        <GuideSection icon={<Home className="h-5 w-5 text-blue-400" />} title="1. App Navigation Overview">
          <p>After logging in, you land on the <strong className="text-white">Home Page</strong> — a dashboard with quick-action cards. Each card leads to a specific feature module.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {[
              { page: "Dashboard", desc: "Commission calculator for drivers" },
              { page: "Commission Table", desc: "Full commission percentage reference" },
              { page: "Info / M-Fuel / Hotspot", desc: "Document libraries for drivers" },
              { page: "CNG Location", desc: "Map of CNG stations" },
              { page: "Driver Income", desc: "Income reports by month/year" },
              { page: "Driver Management", desc: "Credential management for driver accounts" },
              { page: "Driver Requests", desc: "Request submission and management" },
              { page: "Target Trips", desc: "Monthly trip targets and completion" },
              { page: "Driver Master File", desc: "Central driver registry" },
              { page: "Revenue Controller Portal", desc: "Staff account management" },
              { page: "Entry Pass", desc: "Driver entry pass management" },
              { page: "Activity Logs", desc: "Login/logout tracking" },
            ].map(({ page, desc }) => (
              <div key={page} className="flex items-start gap-2 bg-white/5 rounded-lg p-2">
                <ChevronRight className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-white text-xs font-medium">{page}</span>
                  <p className="text-white/50 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </GuideSection>

        {/* Login & Authentication */}
        <GuideSection icon={<LogIn className="h-5 w-5 text-purple-400" />} title="2. Login & Authentication">
          <p>The system supports multiple login methods based on user role:</p>
          <div className="space-y-3 mt-2">
            <div>
              <h4 className="text-white font-medium text-sm">Admin / Staff Login</h4>
              <StepList steps={[
                "Go to the login page",
                "Enter your email and password",
                "Click Sign In — you'll be redirected to the Home Page",
              ]} />
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium text-sm">Driver Login</h4>
              <StepList steps={[
                "Use the driver email format: driverID@amantaxi.com",
                "Enter the password provided by admin",
                "Access is limited to the Driver Portal features",
              ]} />
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium text-sm">Guest Access</h4>
              <StepList steps={[
                'Click "Continue as Guest" on the login page',
                "View public documents and commission calculator only",
              ]} />
            </div>
          </div>
          <Tip>Admin accounts are pre-configured. Contact the system administrator to create new admin or staff accounts.</Tip>
        </GuideSection>

        {/* Driver Management */}
        <GuideSection icon={<Users className="h-5 w-5 text-cyan-400" />} title="3. Driver Account Management">
          <p>Manage driver login credentials from the <strong className="text-white">Driver Management</strong> page.</p>
          <div className="space-y-3 mt-2">
            <div>
              <h4 className="text-white font-medium text-sm">Creating Driver Accounts (Bulk)</h4>
              <StepList steps={[
                'Click "Download Template" to get the CSV format',
                "Fill in Driver IDs (one per row)",
                'Click "Upload CSV" and select your file',
                "The system generates email/password credentials automatically",
                "Credentials are stored and can be viewed on the management page",
              ]} />
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium text-sm">Managing Existing Accounts</h4>
              <StepList steps={[
                "Search by Driver ID using the search box",
                "Toggle the switch to enable/disable accounts",
                "Click the eye icon to view/hide passwords",
                "Use Reset Password to change a driver's password",
              ]} />
            </div>
          </div>
          <Warning>Disabling an account prevents the driver from logging in but does not delete their data.</Warning>
        </GuideSection>

        {/* Income Upload */}
        <GuideSection icon={<Upload className="h-5 w-5 text-green-400" />} title="4. Uploading Driver Income">
          <StepList steps={[
            'Navigate to "Driver Income" from the Home Page',
            "Click the Upload button (admin only)",
            "Select an Excel (.xlsx) or CSV file with the required columns",
            "Required columns: Driver ID, Driver Name, Month, Year, Working Days, Total Income",
            "Optional columns: Shift, Total Trips, Average Daily Income",
            "The system processes and stores the data by month/year",
            "Drivers can view their own income from the Driver Portal",
          ]} />
          <Tip>You can upload data for multiple drivers in a single file. Duplicate entries for the same driver/month/year will be updated.</Tip>
        </GuideSection>

        {/* Target Trips */}
        <GuideSection icon={<Target className="h-5 w-5 text-orange-400" />} title="5. Target Trips Upload">
          <StepList steps={[
            'Navigate to "Target Trips Upload" from the Home Page',
            'Click "Download Template" for the correct CSV format',
            "Fill in: Driver ID, Shift, Final Target (number of trips)",
            "Select the Month and Year for the target period",
            'Click "Upload" to process the file',
            "View results on the Target Trips page with statistics",
          ]} />
          <Warning>Ensure the month/year selection matches the data period. Re-uploading for the same period will create duplicate entries.</Warning>
        </GuideSection>

        {/* Driver Requests */}
        <GuideSection icon={<MessageSquare className="h-5 w-5 text-pink-400" />} title="6. Managing Driver Requests">
          <p>Drivers submit requests (day off, complaints, etc.) which admins and controllers review.</p>
          <div className="space-y-3 mt-2">
            <div>
              <h4 className="text-white font-medium text-sm">Reviewing Requests</h4>
              <StepList steps={[
                'Go to "Admin Requests" from the Home Page',
                "Use filters to narrow by status, type, or controller",
                "Click on a request card to open the response dialog",
                "Update the status (Approved / In Progress / Rejected)",
                "Add an admin response and fleet remarks if needed",
                "Click Submit — the driver receives a push notification",
              ]} />
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium text-sm">Managing Request Types</h4>
              <StepList steps={[
                'Click the "Manage Types" button on the Admin Requests page',
                "Add, edit, or deactivate request type categories",
                "Changes take effect immediately for driver submissions",
              ]} />
            </div>
          </div>
          <Tip>Use the "Export to Excel" button to download all requests for external reporting.</Tip>
        </GuideSection>

        {/* Entry Pass */}
        <GuideSection icon={<ClipboardCheck className="h-5 w-5 text-teal-400" />} title="7. Entry Pass Management">
          <StepList steps={[
            'Navigate to "Admin Entry Pass" from the Home Page',
            "Fill in Driver ID and select a reason from the dropdown",
            'Click "Submit" to create a new entry pass',
            "Each pass gets a unique entry number and QR code",
            "Click on an entry to view details and QR code",
            'Update status to "Done" when the pass is used',
          ]} />
          <Tip>The QR code contains the entry number, driver ID, reason, and timestamp for verification.</Tip>
        </GuideSection>

        {/* Absent Fines */}
        <GuideSection icon={<Ban className="h-5 w-5 text-red-400" />} title="8. Driver Absent Fines">
          <StepList steps={[
            'Navigate to "Driver Absent Fine" from the Home Page',
            'Click "Download Template" for the CSV format',
            "Fill in: Fine No, Driver ID, Vehicle Number, Fine Type, Start Date, End Date, etc.",
            'Click "Upload CSV" to import the records',
            "View summary statistics at the top of the page",
            "Search and filter fines by driver ID or fine type",
            "Drivers see their own fines in the Driver Portal",
          ]} />
        </GuideSection>

        {/* Warning Letters */}
        <GuideSection icon={<AlertTriangle className="h-5 w-5 text-amber-400" />} title="9. Booking Rejection (Warning Letters)">
          <StepList steps={[
            'Navigate to "Warning Letters Upload" from the Home Page',
            'Click "Download Template" for the required CSV format',
            "Fill in: Driver ID, Date, Document No, Name, Taxi No, Reasons, Action Taken",
            "Upload the CSV file to import records",
            "Drivers can view their warning letters in the Driver Portal",
          ]} />
        </GuideSection>

        {/* Master File */}
        <GuideSection icon={<FileSpreadsheet className="h-5 w-5 text-indigo-400" />} title="10. Driver Master File">
          <p>The master file is the central registry mapping drivers to their controllers.</p>
          <StepList steps={[
            'Navigate to "Driver Master File" from the Home Page',
            'Click "Download Template" for the Excel format',
            "Fill in: Driver ID, Driver Name, Controller",
            'Click "Upload" to import — existing data will be cleared first',
            "Use the Add Driver form for single entries",
            "Staff users can view the master file but cannot modify it",
          ]} />
          <Warning>Uploading a new master file replaces all existing entries. Download a backup first if needed.</Warning>
        </GuideSection>

        {/* Revenue Controller Portal */}
        <GuideSection icon={<ShieldCheck className="h-5 w-5 text-violet-400" />} title="11. Staff Account Management">
          <p>Create and manage staff (Revenue Controller) accounts from the <strong className="text-white">Revenue Controller Portal</strong>.</p>
          <StepList steps={[
            "Navigate to the Revenue Controller Portal",
            "Fill in Username, Email, and Password",
            'Select role: "Advanced" (controller) or "User" (read-only staff)',
            'Click "Create User" to generate the account',
            "Manage existing users: change roles, toggle status, reset passwords",
            "Upload profile avatars by clicking the avatar placeholder",
          ]} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <div className="bg-white/5 rounded-lg p-2">
              <Badge variant="outline" className="border-amber-400/50 text-amber-300 bg-amber-500/10 mb-1">Advanced</Badge>
              <p className="text-xs text-white/60">Can respond to requests, manage entry passes, view all driver data</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <Badge variant="outline" className="border-blue-400/50 text-blue-300 bg-blue-500/10 mb-1">User</Badge>
              <p className="text-xs text-white/60">Read-only access to driver data, income, and activity logs</p>
            </div>
          </div>
        </GuideSection>

        {/* Portal Settings */}
        <GuideSection icon={<Settings2 className="h-5 w-5 text-gray-400" />} title="12. Portal Settings">
          <p>Control which features are visible to drivers in the Driver Portal.</p>
          <StepList steps={[
            'Click the "Portal Settings" gear icon on the Home Page',
            "Toggle features on/off using the switches",
            "Changes take effect immediately for all drivers",
          ]} />
          <Tip>Disabled features are hidden from the driver's portal but the data is preserved.</Tip>
        </GuideSection>

        {/* Push Notifications */}
        <GuideSection icon={<Bell className="h-5 w-5 text-pink-400" />} title="13. Push Notifications">
          <p>The app supports web push notifications for real-time updates.</p>
          <div className="space-y-2 mt-2">
            <div>
              <h4 className="text-white font-medium text-sm">When notifications are sent:</h4>
              <ul className="list-disc list-inside space-y-1 mt-1 text-white/70">
                <li>Driver request approved / in progress / rejected</li>
                <li>New driver request submitted (to assigned controller)</li>
                <li>Day-off request approved</li>
                <li>Entry pass status updated</li>
                <li>New admin message posted</li>
              </ul>
            </div>
          </div>
          <Tip>Users must allow notification permissions in their browser. The permission prompt appears on the Home Page.</Tip>
        </GuideSection>

        {/* Video Tutorials */}
        <GuideSection icon={<Video className="h-5 w-5 text-sky-400" />} title="14. Video Tutorials">
          <StepList steps={[
            'Navigate to "Video Tutorials" from the Home Page',
            'Click "Add Video" (admin only)',
            "Enter a title and a Google Drive video link",
            "Videos are embedded for in-app playback",
            "Drivers can access tutorials from their portal",
          ]} />
          <Tip>Use Google Drive "Share" link format. The system automatically converts it to an embeddable preview.</Tip>
        </GuideSection>

        {/* PWA & Install */}
        <GuideSection icon={<Smartphone className="h-5 w-5 text-emerald-400" />} title="15. PWA Installation">
          <p>Commission Compass works as a Progressive Web App — it can be installed on mobile devices.</p>
          <StepList steps={[
            "Open the app in Chrome (Android) or Safari (iOS)",
            'Look for the "Install" banner at the bottom of the screen',
            'Click "Install" to add to your home screen',
            "The app works offline for previously loaded pages",
          ]} />
        </GuideSection>
      </div>
    </PageLayout>
  );
};

export default SystemGuidePage;
