import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, LogIn, LogOut, Calendar, Radio, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import ActivityStatistics from "@/components/activity/ActivityStatistics";
import { PageLayout } from "@/components/shared/PageLayout";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";

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
  const { isAuthenticated, canAccessAdminPages } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isLive, setIsLive] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [activityFilter, setActivityFilter] = useState<"all" | "login" | "logout">("all");

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (!canAccessAdminPages) { navigate("/home"); return; }
    fetchLogs();
  }, [isAuthenticated, canAccessAdminPages, navigate]);

  useEffect(() => {
    if (!canAccessAdminPages || !isLive) return;
    const channel = supabase.channel('activity-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'driver_activity_logs' }, (payload) => {
        const newLog = payload.new as ActivityLog;
        setLogs((prevLogs) => [newLog, ...prevLogs]);
        toast({ title: `New ${newLog.activity_type}`, description: `Driver ${newLog.driver_id} ${newLog.activity_type === 'login' ? 'logged in' : 'logged out'}` });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [canAccessAdminPages, isLive]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Paginate to bypass Supabase's 1000-row default limit
      const all: ActivityLog[] = [];
      const pageSize = 1000;
      let from = 0;
      let startISO: string | null = null;
      let endISO: string | null = null;
      if (dateFilter) {
        const s = new Date(dateFilter); s.setHours(0, 0, 0, 0);
        const e = new Date(dateFilter); e.setHours(23, 59, 59, 999);
        startISO = s.toISOString();
        endISO = e.toISOString();
      }
      while (true) {
        let q = supabase
          .from("driver_activity_logs")
          .select("*")
          .not("driver_id", "in", '("Guest","Guest User")')
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (startISO && endISO) q = q.gte("created_at", startISO).lte("created_at", endISO);
        const { data, error } = await q;
        if (error) { toast({ title: "Error", description: "Failed to fetch activity logs", variant: "destructive" }); return; }
        const batch = (data as ActivityLog[]) || [];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      setLogs(all);
    } catch (error) { console.error("Error:", error); }
    finally { setLoading(false); }
  };

  const filteredLogs = logs.filter(log =>
    log.driver_id.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (activityFilter === "all" || log.activity_type === activityFilter)
  );
  const formatDate = (dateString: string) => format(new Date(dateString), "MMM dd, yyyy hh:mm:ss a");
  const formatDateOnly = (dateString: string) => format(new Date(dateString), "MMM dd, yyyy");
  const formatTimeOnly = (dateString: string) => format(new Date(dateString), "hh:mm:ss a");
  const getBrowserInfo = (userAgent: string | null) => {
    if (!userAgent) return "Unknown";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Other";
  };

  const handleExport = async () => {
    if (!exportFrom || !exportTo) {
      toast({ title: "Select date range", description: "Please choose both From and To dates", variant: "destructive" });
      return;
    }
    const start = new Date(exportFrom); start.setHours(0, 0, 0, 0);
    const end = new Date(exportTo); end.setHours(23, 59, 59, 999);
    if (start > end) {
      toast({ title: "Invalid range", description: "From date must be before To date", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      // Paginate to bypass 1000-row limit
      const all: ActivityLog[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("driver_activity_logs")
          .select("*")
          .not("driver_id", "in", '("Guest","Guest User")')
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = (data as ActivityLog[]) || [];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }

      if (all.length === 0) {
        toast({ title: "No data", description: "No activity logs found in selected range" });
        setExporting(false);
        return;
      }

      const logins = all.filter(l => l.activity_type === "login");
      const logouts = all.filter(l => l.activity_type === "logout");
      const mapRow = (l: ActivityLog) => ({
        "Driver ID": l.driver_id,
        "Activity": l.activity_type === "login" ? "Login" : "Logout",
        "Date": formatDateOnly(l.created_at),
        "Time": formatTimeOnly(l.created_at),
        "Browser": getBrowserInfo(l.user_agent),
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(all.map(mapRow)), "All Activities");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logins.map(mapRow)), "Logins");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logouts.map(mapRow)), "Logouts");

      const fname = `driver-activity-logs_${exportFrom}_to_${exportTo}.xlsx`;
      XLSX.writeFile(wb, fname);
      toast({ title: "Export complete", description: `${all.length} records exported (${logins.length} logins, ${logouts.length} logouts)` });
    } catch (err: any) {
      console.error("Export error:", err);
      toast({ title: "Export failed", description: err.message || "Could not export logs", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageLayout
      title="Driver Activity Logs"
      gradient="from-slate-50 to-slate-100"
      maxWidth="6xl"
    >
      <p className="text-xs sm:text-sm text-muted-foreground -mt-4 mb-6">Track driver login and logout activities</p>

      <Card className="mb-6">
        <CardHeader className="pb-3"><CardTitle className="text-lg">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by Driver ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="pl-9 w-full sm:w-48" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={fetchLogs} variant="outline" size="sm" className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
              <Button onClick={() => setIsLive(!isLive)} variant={isLive ? "default" : "outline"} size="sm" className={`gap-2 ${isLive ? "bg-green-600 hover:bg-green-700" : ""}`}>
                <Radio className={`h-4 w-4 ${isLive ? "animate-pulse" : ""}`} />{isLive ? "Live" : "Paused"}
              </Button>
              <Button onClick={() => setShowStats(!showStats)} variant={showStats ? "default" : "outline"} size="sm" className="gap-2">
                <BarChart3 className="h-4 w-4" />{showStats ? "Hide Stats" : "Show Stats"}
              </Button>
              <div className="flex items-center gap-1 ml-auto bg-muted rounded-md p-1">
                <Button onClick={() => setActivityFilter("all")} size="sm" variant={activityFilter === "all" ? "default" : "ghost"} className="h-7 px-3 text-xs">All</Button>
                <Button onClick={() => setActivityFilter("login")} size="sm" variant={activityFilter === "login" ? "default" : "ghost"} className={`h-7 px-3 text-xs gap-1 ${activityFilter === "login" ? "bg-green-600 hover:bg-green-700 text-white" : "text-green-700"}`}>
                  <LogIn className="h-3 w-3" />Login
                </Button>
                <Button onClick={() => setActivityFilter("logout")} size="sm" variant={activityFilter === "logout" ? "default" : "ghost"} className={`h-7 px-3 text-xs gap-1 ${activityFilter === "logout" ? "bg-red-600 hover:bg-red-700 text-white" : "text-red-700"}`}>
                  <LogOut className="h-3 w-3" />Logout
                </Button>
              </div>
            </div>

            <div className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 mt-2 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <Download className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-900">Export Activity Logs to Excel</p>
                  <p className="text-xs text-emerald-700">Select a date range to download login & logout details</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <div className="relative flex-1">
                    <label className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide block mb-1">From Date</label>
                    <Calendar className="absolute left-3 top-[34px] h-4 w-4 text-emerald-600" />
                    <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="pl-9 border-emerald-300 bg-white focus-visible:ring-emerald-500" />
                  </div>
                  <div className="relative flex-1">
                    <label className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide block mb-1">To Date</label>
                    <Calendar className="absolute left-3 top-[34px] h-4 w-4 text-emerald-600" />
                    <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="pl-9 border-emerald-300 bg-white focus-visible:ring-emerald-500" />
                  </div>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all sm:self-end sm:mb-[1px] h-10 px-6"
                >
                  <Download className={`h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
                  {exporting ? "Exporting..." : "Download Excel"}
                </Button>
              </div>
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
            <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><LogIn className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No activity logs found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver ID</TableHead><TableHead>Activity</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead>
                    <TableHead className="hidden md:table-cell">Browser</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.driver_id}</TableCell>
                      <TableCell>
                        <Badge variant={log.activity_type === "login" ? "default" : "secondary"} className={`gap-1 ${log.activity_type === "login" ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                          {log.activity_type === "login" ? <LogIn className="h-3 w-3" /> : <LogOut className="h-3 w-3" />}
                          {log.activity_type === "login" ? "Login" : "Logout"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateOnly(log.created_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatTimeOnly(log.created_at)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{getBrowserInfo(log.user_agent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default DriverActivityLogsPage;
