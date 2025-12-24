
import { useState, useEffect } from "react";
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
import { ArrowLeft, Search, Users, UserCheck, UserX, RefreshCw, CheckCircle2, XCircle, Download } from "lucide-react";

interface DriverCredential {
  id: string;
  driver_id: string;
  user_id: string | null;
  status: string;
  created_at: string | null;
}

const DriverManagementPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [drivers, setDrivers] = useState<DriverCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home");
      return;
    }
    fetchDrivers();
  }, [isAdmin, navigate]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
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

  const filteredDrivers = drivers.filter(driver =>
    driver.driver_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const enabledCount = drivers.filter(d => d.status === 'enabled').length;
  const disabledCount = drivers.filter(d => d.status === 'disabled').length;

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-4 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
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
            <h1 className="text-2xl md:text-3xl font-bold text-indigo-800">
              Driver Management
            </h1>
            <p className="text-slate-600">Manage driver accounts and access</p>
          </div>
          <div className="ml-auto">
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="bg-white hover:bg-green-50 border-green-200 text-green-700 hover:text-green-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV Template
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-600">Loading drivers...</span>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {searchTerm ? "No drivers found matching your search" : "No drivers registered yet"}
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
    </div>
  );
};

export default DriverManagementPage;
