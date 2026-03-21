import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useCallback } from "react";
import { PageLayout } from "@/components/shared/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  FileText, Users, Shield, Layers, Database, Globe,
  Bell, Smartphone, Settings2, Target, ClipboardCheck, Printer
} from "lucide-react";

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
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

const RoleBadge = ({ role, color }: { role: string; color: string }) => (
  <Badge variant="outline" className={`border-${color}-400/50 text-${color}-300 bg-${color}-500/10`}>
    {role}
  </Badge>
);

const PRDPage = () => {
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
      title="Product Requirements Document"
      icon={<FileText className="h-6 w-6" />}
      variant="dark"
      gradient="from-slate-900 via-indigo-900 to-slate-900"
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
        {/* Overview */}
        <Section icon={<Globe className="h-5 w-5 text-blue-400" />} title="1. Product Overview">
          <p>
            <strong className="text-white">Commission Compass</strong> is a web-based fleet management platform
            for Aman Taxi, providing commission calculation, driver management, income tracking,
            and operational tools for administrators, revenue controllers, and drivers.
          </p>
          <p>
            Built as a Progressive Web App (PWA) with offline support and push notifications,
            accessible on desktop and mobile devices.
          </p>
        </Section>

        {/* User Roles */}
        <Section icon={<Shield className="h-5 w-5 text-purple-400" />} title="2. User Roles & Access Control">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="border-red-400/50 text-red-300 bg-red-500/10">Admin</Badge>
              </div>
              <p>Full system access: manage drivers, upload data, configure portal settings, manage users, view all reports and logs.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="border-amber-400/50 text-amber-300 bg-amber-500/10">Advanced (Revenue Controller)</Badge>
              </div>
              <p>Fleet-wide read access to driver data, can respond to assigned driver requests, manage entry passes. Cannot access driver-specific portals.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="border-blue-400/50 text-blue-300 bg-blue-500/10">User (Staff)</Badge>
              </div>
              <p>Read access to driver income, target trips, credentials, requests, and activity logs across the fleet.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="border-green-400/50 text-green-300 bg-green-500/10">Driver</Badge>
              </div>
              <p>Access to personal portal: view income, target trips, warning letters, submit requests, entry passes, and private messages.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="border-gray-400/50 text-gray-300 bg-gray-500/10">Guest</Badge>
              </div>
              <p>Limited access: view public documents (Info, M-Fuel, Hotspot) and commission calculator only.</p>
            </div>
          </div>
        </Section>

        {/* Core Features */}
        <Section icon={<Layers className="h-5 w-5 text-cyan-400" />} title="3. Core Features">
          <div className="space-y-3">
            <div>
              <h4 className="text-white font-medium">Commission Calculator</h4>
              <p>Calculate driver commission percentages based on revenue tiers. Supports single/double shift with and without basic salary configurations.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">Driver Income Management</h4>
              <p>Upload and view driver income reports via Excel/CSV. Drivers see their own data; admins see all. Supports month/year filtering and receipt generation.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">Target Trips</h4>
              <p>Upload driver target trips via CSV (Driver ID, Shift, Final Target). Track completion across months with statistics dashboard.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">Driver Requests System</h4>
              <p>Drivers submit requests (day off, complaints, etc.). Admins/controllers respond, filter by status/type/controller, and export to Excel. Includes day-off calendar and push notification on response.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">Entry Pass Management</h4>
              <p>Drivers submit entry pass requests. Admins approve/reject with status tracking and notifications.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">Driver Absent Fines</h4>
              <p>Track and manage driver absence fines with upload support, fine type categorization, and driver-facing view.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">Booking Rejection (Warning Letters)</h4>
              <p>Upload and track driver warning letters with document numbers, reasons, and action taken records.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">Driver Credential Management</h4>
              <p>Bulk create driver accounts via CSV, toggle enable/disable status, reset passwords, and download credential templates.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">Document Management</h4>
              <p>Upload and share documents across Info, M-Fuel, and Hotspot categories. Guests can view; admins manage.</p>
            </div>
          </div>
        </Section>

        {/* Admin Features */}
        <Section icon={<Settings2 className="h-5 w-5 text-amber-400" />} title="4. Admin-Only Features">
          <ul className="list-disc list-inside space-y-2">
            <li>Portal Settings: Toggle driver portal features on/off dynamically</li>
            <li>Revenue Controller Portal: Create/manage staff accounts, assign roles, upload avatars, reset passwords</li>
            <li>Driver Master File: Central driver registry with controller assignments</li>
            <li>Activity Logs: Track login/logout activity across all users</li>
            <li>SMS Messaging: Send messages to drivers</li>
            <li>Video Tutorials: Upload and manage tutorial videos for drivers</li>
            <li>Bulk Operations: CSV upload for credentials, income, target trips, warning letters</li>
          </ul>
        </Section>

        {/* Technical Architecture */}
        <Section icon={<Database className="h-5 w-5 text-emerald-400" />} title="5. Technical Architecture">
          <div className="space-y-3">
            <div>
              <h4 className="text-white font-medium">Frontend</h4>
              <p>React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui components, React Router v6, TanStack React Query.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">Backend</h4>
              <p>Supabase (PostgreSQL): Auth, Row-Level Security (RLS), Edge Functions (Deno), Realtime subscriptions, Storage buckets.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">Security</h4>
              <p>Role-based access via <code className="bg-white/10 px-1 rounded">user_roles</code> table with <code className="bg-white/10 px-1 rounded">app_role</code> enum (admin, user, driver, advanced). RLS policies on all tables. Security-definer functions for role checks.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <h4 className="text-white font-medium">PWA</h4>
              <p>Service worker for offline caching, web push notifications via VAPID keys, install banner for mobile devices.</p>
            </div>
          </div>
        </Section>

        {/* Database Schema */}
        <Section icon={<Database className="h-5 w-5 text-teal-400" />} title="6. Database Tables">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              "user_roles", "driver_credentials", "driver_income", "driver_master_file",
              "target_trips", "driver_requests", "driver_request_types", "driver_absent_fines",
              "warning_letters", "entry_passes", "admin_messages", "documents",
              "driver_activity_logs", "driver_portal_settings", "driver_income_settings",
              "push_subscriptions", "uploaded_files", "video_tutorials"
            ].map(table => (
              <Badge key={table} variant="outline" className="border-white/20 text-white/70 text-xs justify-center py-1">
                {table}
              </Badge>
            ))}
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={<Bell className="h-5 w-5 text-pink-400" />} title="7. Push Notifications">
          <ul className="list-disc list-inside space-y-2">
            <li>Request response notifications to drivers</li>
            <li>New request notifications to assigned controllers</li>
            <li>Day-off approval notifications</li>
            <li>Entry pass status update notifications</li>
            <li>Admin message notifications</li>
            <li>Request reminder notifications</li>
          </ul>
        </Section>

        {/* Storage */}
        <Section icon={<Smartphone className="h-5 w-5 text-orange-400" />} title="8. Storage Buckets">
          <div className="grid grid-cols-2 gap-2">
            {[
              "uploads", "info-docs", "mfuel-docs", "hotspot-docs", "driver-data",
              "driver_income_documents", "admin-message-images", "user-avatars"
            ].map(bucket => (
              <Badge key={bucket} variant="outline" className="border-white/20 text-white/70 text-xs justify-center py-1">
                {bucket}
              </Badge>
            ))}
          </div>
        </Section>
      </div>
    </PageLayout>
  );
};

export default PRDPage;
