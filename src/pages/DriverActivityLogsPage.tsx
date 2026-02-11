import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, RefreshCw, LogIn, LogOut, Calendar, Radio, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import ActivityStatistics from "@/components/activity/ActivityStatistics";

interface ActivityLog {
  id: string;
  driver_id: string;
  user_id: string;
  activity_type: "login" | "logout";
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const DriverActivityLogsPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, canAccessAdminPages } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isLive, setIsLive] = useState(true);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (!canAccessAdminPages) {
      navigate("/home");
      return;
    }
    fetchLogs();
  }, [isAuthenticated, canAccessAdminPages, navigate]);

  // Real-time subscription for new activity logs
  useEffect(() => {
    if (!canAccessAdminPages || !isLive) return;

    console.log("Setting up real-time subscription for activity logs");
    
    const channel = supabase
      .channel('activity-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_activity_logs'
        },
        (payload) => {
          console.log("New activity log received:", payload);
          const newLog = payload.new as ActivityLog;
          
          // Add to the beginning of the logs array
          setLogs((prevLogs) => [newLog, ...prevLogs]);
          
          toast({
            title: `New ${newLog.activity_type}`,
            description: `Driver ${newLog.driver_id} ${newLog.activity_type === 'login' ? 'logged in' : 'logged out'}`,
          });
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [isAdmin, isLive]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("driver_activity_logs")
        .select("*")
        .not("driver_id", "in", '("Guest","Guest User")')
        .order("created_at", { ascending: false })
        .limit(500);

      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching logs:", error);
        toast({
          title: "Error",
          description: "Failed to fetch activity logs",
          variant: "destructive"
        });
        return;
      }

      setLogs((data as ActivityLog[]) || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.driver_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy hh:mm:ss a");
  };

  const getBrowserInfo = (userAgent: string | null) => {
    if (!userAgent) return "Unknown";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Other";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        <div className="flex items-center gap-3 sm:gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
            className="rounded-full shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Driver Activity Logs</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Track driver login and logout activities</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Driver ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-9 w-full sm:w-48"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={fetchLogs} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button 
                  onClick={() => setIsLive(!isLive)} 
                  variant={isLive ? "default" : "outline"} 
                  size="sm"
                  className={`gap-2 ${isLive ? "bg-green-600 hover:bg-green-700" : ""}`}
                >
                  <Radio className={`h-4 w-4 ${isLive ? "animate-pulse" : ""}`} />
                  {isLive ? "Live" : "Paused"}
                </Button>
                <Button 
                  onClick={() => setShowStats(!showStats)} 
                  variant={showStats ? "default" : "outline"} 
                  size="sm"
                  className="gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  {showStats ? "Hide Stats" : "Show Stats"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {showStats && <ActivityStatistics logs={logs} />}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Activity History</CardTitle>
              <Badge variant="secondary">{filteredLogs.length} records</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <LogIn className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver ID</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead className="hidden md:table-cell">Browser</TableHead>
                      <TableHead className="hidden lg:table-cell">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.driver_id}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={log.activity_type === "login" ? "default" : "secondary"}
                            className={`gap-1 ${
                              log.activity_type === "login" 
                                ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            {log.activity_type === "login" ? (
                              <LogIn className="h-3 w-3" />
                            ) : (
                              <LogOut className="h-3 w-3" />
                            )}
                            {log.activity_type === "login" ? "Login" : "Logout"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {getBrowserInfo(log.user_agent)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {log.ip_address || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverActivityLogsPage;
