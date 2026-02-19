
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Search, Users, UserCheck, UserX, RefreshCw, CheckCircle2, XCircle, Download, Upload, Loader2, Trash2, KeyRound } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { uploadDriverCredential } from "@/services/driverUploadService";
import { Progress } from "@/components/ui/progress";
import { ResetDriverPasswordDialog } from "@/components/admin/ResetDriverPasswordDialog";

interface DriverCredential {
  id: string;
  driver_id: string;
  user_id: string | null;
  status: string;
  created_at: string | null;
}

const DriverManagementPage = () => {
  const navigate = useNavigate();
  const { isAdmin, canAccessAdminPages, user } = useAuth();
  const [drivers, setDrivers] = useState<DriverCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; currentDriverId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [resetPasswordDriver, setResetPasswordDriver] = useState<string | null>(null);
  

  const isStaff = canAccessAdminPages && !isAdmin;

  useEffect(() => {
    if (!canAccessAdminPages) {
      navigate("/home");
      return;
    }
    fetchDrivers();
  }, [canAccessAdminPages, navigate]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      // Supabase has a default limit of 1000 rows per query
      // We need to paginate to get all drivers
      const PAGE_SIZE = 1000;
      let allDrivers: DriverCredential[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('driver_credentials')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allDrivers = [...allDrivers, ...data];
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      setDrivers(allDrivers);
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  const toggleDriverStatus = async (driver: DriverCredential) => {
    setUpdatingId(driver.id);
    const newStatus = driver.status === 'enabled' ? 'disabled' : 'enabled';
    
    try {
      const { error } = await supabase
        .from('driver_credentials')
        .update({ status: newStatus })
        .eq('id', driver.id);

      if (error) throw error;

      setDrivers(prev => 
        prev.map(d => d.id === driver.id ? { ...d, status: newStatus } : d)
      );
      
      toast.success(`Driver ${driver.driver_id} ${newStatus === 'enabled' ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error("Error updating driver status:", error);
      toast.error("Failed to update driver status");
    } finally {
      setUpdatingId(null);
    }
  };

  const bulkUpdateStatus = async (newStatus: 'enabled' | 'disabled') => {
    if (drivers.length === 0) return;
    
    setBulkUpdating(true);
    try {
      const { error } = await supabase
        .from('driver_credentials')
        .update({ status: newStatus })
        .neq('status', newStatus); // Only update drivers that need changing

      if (error) throw error;

      setDrivers(prev => prev.map(d => ({ ...d, status: newStatus })));
      
      const count = drivers.filter(d => d.status !== newStatus).length;
      toast.success(`${count} driver(s) ${newStatus === 'enabled' ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error("Error bulk updating driver status:", error);
      toast.error("Failed to update drivers");
    } finally {
      setBulkUpdating(false);
    }
  };

  const clearAllDriverCredentials = async () => {
    if (drivers.length === 0) return;
    
    setIsClearing(true);
    try {
      const { error } = await supabase
        .from('driver_credentials')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) throw error;

      setDrivers([]);
      toast.success("All driver credentials cleared successfully");
    } catch (error: any) {
      console.error("Error clearing driver credentials:", error);
      toast.error("Failed to clear driver credentials: " + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "driverId,password,status\nDRV001,password123,enabled\nDRV002,password456,disabled";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "driver_credentials_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template downloaded");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(null);
    
    try {
      const result = await uploadDriverCredential(file, (progress) => {
        setUploadProgress(progress);
      });
      
      if (result.success.length > 0) {
        toast.success(`Successfully uploaded ${result.success.length} driver(s)`);
      }
      
      if (result.errors.length > 0) {
        toast.error(`Failed to upload ${result.errors.length} driver(s)`);
        console.error("Upload errors:", result.errors);
      }

      // Refresh the driver list
      await fetchDrivers();
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file: " + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.driver_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const enabledCount = drivers.filter(d => d.status === 'enabled').length;
  const disabledCount = drivers.filter(d => d.status === 'disabled').length;

  if (!canAccessAdminPages) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="hover:bg-indigo-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-800">
                Driver Management
              </h1>
              <p className="text-sm text-slate-600">Manage driver accounts and access</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="bg-white hover:bg-green-50 border-green-200 text-green-700 hover:text-green-800 text-xs sm:text-sm"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Download CSV Template</span>
                <span className="sm:hidden">Template</span>
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                id="driver-csv-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-white hover:bg-purple-50 border-purple-200 text-purple-700 hover:text-purple-800 text-xs sm:text-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                    <span className="hidden sm:inline">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Upload CSV</span>
                    <span className="sm:hidden">Upload</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Upload Progress Indicator */}
        {isUploading && uploadProgress && (
          <Card className="bg-white shadow-sm border-purple-200">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    Processing: <span className="font-medium text-purple-700">{uploadProgress.currentDriverId}</span>
                  </span>
                  <span className="text-slate-600">
                    {uploadProgress.current} / {uploadProgress.total}
                  </span>
                </div>
                <Progress 
                  value={(uploadProgress.current / uploadProgress.total) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-slate-500 text-center">
                  {Math.round((uploadProgress.current / uploadProgress.total) * 100)}% complete
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Drivers</p>
                <p className="text-2xl font-bold text-slate-800">{drivers.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 bg-green-100 rounded-full">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Enabled</p>
                <p className="text-2xl font-bold text-green-600">{enabledCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 bg-red-100 rounded-full">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Disabled</p>
                <p className="text-2xl font-bold text-red-600">{disabledCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Driver Table */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-lg font-semibold text-slate-800">
                Driver Accounts
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isClearing || drivers.length === 0}
                          className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
                        >
                          {isClearing ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-1" />
                          )}
                          Clear All
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear All Driver Credentials?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all {drivers.length} driver credential records from the database. 
                            This action cannot be undone. The auth users will remain but their driver credentials will be removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={clearAllDriverCredentials}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Yes, Clear All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bulkUpdateStatus('enabled')}
                      disabled={bulkUpdating || drivers.length === 0 || enabledCount === drivers.length}
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Enable All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => bulkUpdateStatus('disabled')}
                      disabled={bulkUpdating || drivers.length === 0 || disabledCount === drivers.length}
                      className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Disable All
                    </Button>
                  </>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by Driver ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full md:w-64"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchDrivers}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading || bulkUpdating ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-600">
                  {bulkUpdating ? "Updating drivers..." : "Loading drivers..."}
                </span>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {searchTerm ? "No drivers found matching your search" : "No drivers registered yet. Upload a CSV to add drivers."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Driver ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                          {driver.driver_id}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={driver.status === 'enabled' ? 'default' : 'secondary'}
                            className={
                              driver.status === 'enabled'
                                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                : 'bg-red-100 text-red-700 hover:bg-red-100'
                            }
                          >
                            {driver.status === 'enabled' ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {driver.created_at
                            ? new Date(driver.created_at).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setResetPasswordDriver(driver.driver_id)}
                              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              title="Reset Password"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-slate-600 mr-2">
                              {driver.status === 'enabled' ? 'Enabled' : 'Disabled'}
                            </span>
                            <Switch
                              checked={driver.status === 'enabled'}
                              onCheckedChange={() => toggleDriverStatus(driver)}
                              disabled={updatingId === driver.id}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-8 flex flex-col items-center justify-center gap-2 py-4 border-t border-gray-200">
          <img 
            src="/lovable-uploads/aman-logo-footer.png" 
            alt="Aman Taxi Sharjah" 
            className="h-8 sm:h-10 object-contain"
          />
          <p className="text-xs sm:text-sm text-gray-500">All Rights Reserved</p>
        </footer>
      </div>

      {/* Reset Password Dialog */}
      <ResetDriverPasswordDialog
        isOpen={!!resetPasswordDriver}
        onClose={() => setResetPasswordDriver(null)}
        driverId={resetPasswordDriver || ""}
        onSuccess={fetchDrivers}
      />
    </div>
  );
};

export default DriverManagementPage;
