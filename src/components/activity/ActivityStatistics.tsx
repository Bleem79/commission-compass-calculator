import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Users, Clock, TrendingUp, Crown } from "lucide-react";
import { format, getHours } from "date-fns";

interface ActivityLog {
  id: string;
  driver_id: string;
  user_id: string;
  activity_type: "login" | "logout";
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface ActivityStatisticsProps {
  logs: ActivityLog[];
}

interface DriverActivity {
  driverId: string;
  loginCount: number;
  logoutCount: number;
  totalActivity: number;
}

const ActivityStatistics = ({ logs }: ActivityStatisticsProps) => {
  const stats = useMemo(() => {
    const loginCount = logs.filter(log => log.activity_type === "login").length;
    const logoutCount = logs.filter(log => log.activity_type === "logout").length;
    
    // Calculate unique drivers
    const uniqueDrivers = new Set(logs.map(log => log.driver_id)).size;
    
    // Calculate most active drivers
    const driverActivityMap = new Map<string, DriverActivity>();
    logs.forEach(log => {
      const existing = driverActivityMap.get(log.driver_id) || {
        driverId: log.driver_id,
        loginCount: 0,
        logoutCount: 0,
        totalActivity: 0
      };
      
      if (log.activity_type === "login") {
        existing.loginCount++;
      } else {
        existing.logoutCount++;
      }
      existing.totalActivity++;
      driverActivityMap.set(log.driver_id, existing);
    });
    
    const mostActiveDrivers = Array.from(driverActivityMap.values())
      .sort((a, b) => b.totalActivity - a.totalActivity)
      .slice(0, 5);
    
    // Calculate peak usage hours
    const hourCounts = new Array(24).fill(0);
    logs.forEach(log => {
      const hour = getHours(new Date(log.created_at));
      hourCounts[hour]++;
    });
    
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .filter(h => h.count > 0);
    
    const formatHour = (hour: number) => {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:00 ${period}`;
    };

    return {
      loginCount,
      logoutCount,
      uniqueDrivers,
      mostActiveDrivers,
      peakHours,
      formatHour
    };
  }, [logs]);

  return (
    <div className="grid gap-4 mb-6">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Total Logins</p>
                <p className="text-2xl font-bold text-green-800">{stats.loginCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-200 flex items-center justify-center">
                <LogIn className="h-5 w-5 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Total Logouts</p>
                <p className="text-2xl font-bold text-red-800">{stats.logoutCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-200 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Unique Drivers</p>
                <p className="text-2xl font-bold text-blue-800">{stats.uniqueDrivers}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-200 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Total Activities</p>
                <p className="text-2xl font-bold text-purple-800">{logs.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-200 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Most Active Drivers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Most Active Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.mostActiveDrivers.length === 0 ? (
              <p className="text-muted-foreground text-sm">No activity data available</p>
            ) : (
              <div className="space-y-3">
                {stats.mostActiveDrivers.map((driver, index) => (
                  <div 
                    key={driver.driverId} 
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${index === 0 ? 'bg-amber-100 text-amber-700' : 
                          index === 1 ? 'bg-gray-200 text-gray-700' : 
                          index === 2 ? 'bg-orange-100 text-orange-700' : 
                          'bg-muted text-muted-foreground'}
                      `}>
                        {index + 1}
                      </span>
                      <span className="font-medium">{driver.driverId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1 text-green-600">
                        <LogIn className="h-3 w-3" />
                        {driver.loginCount}
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-red-600">
                        <LogOut className="h-3 w-3" />
                        {driver.logoutCount}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Usage Times */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Peak Usage Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.peakHours.length === 0 ? (
              <p className="text-muted-foreground text-sm">No activity data available</p>
            ) : (
              <div className="space-y-3">
                {stats.peakHours.map((peak, index) => {
                  const maxCount = stats.peakHours[0]?.count || 1;
                  const percentage = (peak.count / maxCount) * 100;
                  
                  return (
                    <div key={peak.hour} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stats.formatHour(peak.hour)}</span>
                        <span className="text-muted-foreground">{peak.count} activities</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            index === 0 ? 'bg-blue-500' : 
                            index === 1 ? 'bg-blue-400' : 
                            'bg-blue-300'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                
                <div className="pt-2 text-xs text-muted-foreground">
                  Based on {logs.length} recorded activities
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivityStatistics;
