import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { PageLayout } from "@/components/shared/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard, StatsGrid } from "@/components/shared/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  Car,
  Shield,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CalendarIcon,
  Search,
} from "lucide-react";

interface OutstandingRecord {
  id: string;
  emp_cde: string;
  accident: number | null;
  traffic_fines: number | null;
  shj_rta_fines: number | null;
  total_external_fines: number | null;
  total_outstanding: number | null;
  fleet_status: string | null;
  created_at: string;
}

const PIE_COLORS = ["#ef4444", "#f59e0b", "#6366f1", "#8b5cf6"];

const FINE_RANGES = [
  { label: "0.00", labelTo: "4,999.99", min: 0, max: 5000 },
  { label: "5,000.00", labelTo: "6,999.99", min: 5000, max: 7000 },
  { label: "7,000.00", labelTo: "9,999.99", min: 7000, max: 10000 },
  { label: "10,000.00", labelTo: "14,999.99", min: 10000, max: 15000 },
  { label: "15,000.00", labelTo: "19,999.99", min: 15000, max: 20000 },
  { label: "20,000.00", labelTo: "24,999.99", min: 20000, max: 25000 },
  { label: "25,000.00", labelTo: "Above", min: 25000, max: Infinity },
];

const fmtNum = (n: number) =>
  n.toLocaleString("en-AE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtAed = (n: number) =>
  n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TotalBalanceKPIPage = () => {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [records, setRecords] = useState<OutstandingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [trendData, setTrendData] = useState<{ date: string; totalBalance: number; accident: number; traffic: number; rta: number; drivers: number }[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{ rangeIndex: number; fleet: "onRoad" | "offRoad" | "total" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<OutstandingRecord | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    try {
      // Always fetch from latest upload date
      const latestDate = availableDates[0];
      if (!latestDate) { setSearchNotFound(true); setSearchLoading(false); return; }
      const { data, error } = await supabase
        .from("total_outstanding")
        .select("*")
        .ilike("emp_cde", q)
        .gte("created_at", latestDate + "T00:00:00")
        .lt("created_at", latestDate + "T23:59:59.999")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setSearchResult(data as OutstandingRecord);
        setSearchNotFound(false);
      } else {
        setSearchResult(null);
        setSearchNotFound(true);
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchNotFound(true);
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch available dates first
  useEffect(() => {
    const fetchDates = async () => {
      const { data } = await supabase
        .from("total_outstanding")
        .select("created_at")
        .order("created_at", { ascending: false });
      if (data) {
        const uniqueDates = [...new Set(data.map((r) => r.created_at.split("T")[0]))];
        setAvailableDates(uniqueDates);
        if (uniqueDates.length > 0 && !selectedDate) {
          setSelectedDate(new Date(uniqueDates[0] + "T00:00:00"));
        }
      }
    };
    if (isAdmin) fetchDates();
  }, [isAdmin]);

  // Fetch trend data across all dates
  useEffect(() => {
    const fetchTrend = async () => {
      if (!availableDates.length) return;
      setTrendLoading(true);
      try {
        const trendResults: typeof trendData = [];
        for (const dateStr of availableDates.slice().reverse()) {
          let allRecs: { total_outstanding: number | null; accident: number | null; traffic_fines: number | null; shj_rta_fines: number | null; emp_cde: string }[] = [];
          let from = 0;
          const pageSize = 1000;
          let hasMore = true;
          while (hasMore) {
            const { data, error } = await supabase
              .from("total_outstanding")
              .select("total_outstanding,accident,traffic_fines,shj_rta_fines,emp_cde")
              .gte("created_at", dateStr + "T00:00:00")
              .lt("created_at", dateStr + "T23:59:59.999")
              .range(from, from + pageSize - 1);
            if (error) throw error;
            if (data && data.length > 0) {
              allRecs = [...allRecs, ...data];
              from += pageSize;
              hasMore = data.length === pageSize;
            } else {
              hasMore = false;
            }
          }
          trendResults.push({
            date: format(new Date(dateStr + "T00:00:00"), "dd MMM"),
            totalBalance: allRecs.reduce((s, r) => s + (r.total_outstanding || 0), 0),
            accident: allRecs.reduce((s, r) => s + (r.accident || 0), 0),
            traffic: allRecs.reduce((s, r) => s + (r.traffic_fines || 0), 0),
            rta: allRecs.reduce((s, r) => s + (r.shj_rta_fines || 0), 0),
            drivers: new Set(allRecs.map((r) => r.emp_cde)).size,
          });
        }
        setTrendData(trendResults);
      } catch (err) {
        console.error("Error fetching trend data:", err);
      } finally {
        setTrendLoading(false);
      }
    };
    fetchTrend();
  }, [availableDates]);

  // Fetch records for selected date
  useEffect(() => {
    if (!selectedDate || !isAdmin) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        let allRecords: OutstandingRecord[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from("total_outstanding")
            .select("*")
            .gte("created_at", dateStr + "T00:00:00")
            .lt("created_at", dateStr + "T23:59:59.999")
            .order("created_at", { ascending: false })
            .range(from, from + pageSize - 1);
          if (error) throw error;
          if (data && data.length > 0) {
            allRecords = [...allRecords, ...data];
            from += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }
        setRecords(allRecords);
      } catch (err) {
        console.error("Error fetching KPI data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate, isAdmin]);

  const stats = useMemo(() => {
    if (!records.length) return null;

    const totalDrivers = new Set(records.map((r) => r.emp_cde)).size;
    const totalBalance = records.reduce((s, r) => s + (r.total_outstanding || 0), 0);
    const totalAccident = records.reduce((s, r) => s + (r.accident || 0), 0);
    const totalTraffic = records.reduce((s, r) => s + (r.traffic_fines || 0), 0);
    const totalRTA = records.reduce((s, r) => s + (r.shj_rta_fines || 0), 0);
    const totalExternal = records.reduce((s, r) => s + (r.total_external_fines || 0), 0);
    const totalInternal = totalBalance - totalExternal;
    const avgPerDriver = totalBalance / totalDrivers;

    const ranges = [
      { label: "0 - 1K", min: 0, max: 1000, count: 0 },
      { label: "1K - 5K", min: 1000, max: 5000, count: 0 },
      { label: "5K - 10K", min: 5000, max: 10000, count: 0 },
      { label: "10K - 20K", min: 10000, max: 20000, count: 0 },
      { label: "20K+", min: 20000, max: Infinity, count: 0 },
    ];
    records.forEach((r) => {
      const val = r.total_outstanding || 0;
      const range = ranges.find((rng) => val >= rng.min && val < rng.max);
      if (range) range.count++;
    });

    const top10 = [...records]
      .sort((a, b) => (b.total_outstanding || 0) - (a.total_outstanding || 0))
      .slice(0, 10);

    const zeroBalance = records.filter((r) => (r.total_outstanding || 0) === 0).length;

    const pieData = [
      { name: "Accident", value: totalAccident },
      { name: "Traffic Fines", value: totalTraffic },
      { name: "SHJ RTA Fines", value: totalRTA },
      { name: "Internal & Misc", value: totalInternal > 0 ? totalInternal : 0 },
    ];

    // External fines breakdown by On Road / Off Road
    const onRoad = records.filter((r) => r.fleet_status === "OnRoad");
    const offRoad = records.filter((r) => r.fleet_status === "Off Road");

    const calcRangeData = (recs: OutstandingRecord[]) =>
      FINE_RANGES.map((range) => {
        const inRange = recs.filter((r) => {
          const ext = r.total_external_fines || 0;
          return ext >= range.min && ext < range.max;
        });
        return {
          count: inRange.length,
          extFines: inRange.reduce((s, r) => s + (r.total_external_fines || 0), 0),
          totalOut: inRange.reduce((s, r) => s + (r.total_outstanding || 0), 0),
        };
      });

    const onRoadRanges = calcRangeData(onRoad);
    const offRoadRanges = calcRangeData(offRoad);
    const totalRanges = calcRangeData(records);

    return {
      totalDrivers, totalBalance, totalAccident, totalTraffic, totalRTA,
      totalExternal, totalInternal, avgPerDriver, ranges, top10, zeroBalance, pieData,
      onRoadRanges, offRoadRanges, totalRanges,
      onRoadCount: onRoad.length, offRoadCount: offRoad.length,
    };
  }, [records]);

  const drillDownDrivers = useMemo(() => {
    if (!drillDown || !records.length) return [];
    const range = FINE_RANGES[drillDown.rangeIndex];
    let filtered = records.filter((r) => {
      const ext = r.total_external_fines || 0;
      return ext >= range.min && ext < range.max;
    });
    if (drillDown.fleet === "onRoad") filtered = filtered.filter((r) => r.fleet_status === "OnRoad");
    else if (drillDown.fleet === "offRoad") filtered = filtered.filter((r) => r.fleet_status === "Off Road");
    return filtered.sort((a, b) => (b.total_outstanding || 0) - (a.total_outstanding || 0));
  }, [drillDown, records]);

  if (adminLoading) {
    return (
      <PageLayout title="Driver Outstanding KPI" icon={<TrendingUp className="w-6 h-6" />} backPath="/home">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageLayout>
    );
  }

  const chartConfig = { count: { label: "Drivers", color: "hsl(var(--primary))" } };
  const pieChartConfig = {
    Accident: { label: "Accident", color: "#ef4444" },
    "Traffic Fines": { label: "Traffic Fines", color: "#f59e0b" },
    "SHJ RTA Fines": { label: "SHJ RTA Fines", color: "#6366f1" },
    "Internal & Misc": { label: "Internal & Misc", color: "#8b5cf6" },
  };

  return (
    <PageLayout
      title="Driver Outstanding KPI"
      icon={<TrendingUp className="w-6 h-6" />}
      backPath="/home"
    >
      {/* Date Picker & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[200px] justify-start text-left font-normal min-h-[44px]",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "dd MMM yyyy") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => {
                const ds = format(date, "yyyy-MM-dd");
                return !availableDates.includes(ds);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {selectedDate && (
          <span className="text-sm text-muted-foreground">
            {records.length} records
          </span>
        )}

        {/* Driver Search */}
        <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Driver ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchNotFound(false);
                setSearchResult(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="pl-9 w-full sm:w-[200px] min-h-[44px]"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            disabled={searchLoading}
            onClick={handleSearch}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search Result Card */}
      {searchResult && (
        <Card className="bg-card border-border mb-6 border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Search className="w-4 h-4" />
                Driver: {searchResult.emp_cde}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setSearchResult(null); setSearchQuery(""); }}>
                ✕
              </Button>
            </div>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium w-fit",
              searchResult.fleet_status === "OnRoad"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            )}>
              {searchResult.fleet_status === "OnRoad" ? "On Road" : "Off Road"}
            </span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Total Balance", value: fmtAed(searchResult.total_outstanding || 0), color: "text-red-600" },
                { label: "Accident", value: fmtAed(searchResult.accident || 0) },
                { label: "Traffic Fines", value: fmtAed(searchResult.traffic_fines || 0) },
                { label: "SHJ RTA Fines", value: fmtAed(searchResult.shj_rta_fines || 0) },
                { label: "External Fines", value: fmtAed(searchResult.total_external_fines || 0) },
                { label: "Internal & Misc", value: fmtAed(Math.max(0, (searchResult.total_outstanding || 0) - (searchResult.total_external_fines || 0))) },
              ].map((item) => (
                <div key={item.label} className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={cn("text-sm sm:text-base font-bold", item.color || "text-foreground")}>
                    AED {item.value}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {searchNotFound && (
        <Card className="bg-card border-border mb-6 border-destructive/30">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">No driver found with ID "<span className="font-medium text-foreground">{searchQuery}</span>" in selected date.</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : !stats ? (
        <p className="text-muted-foreground text-center py-10">No data available for selected date.</p>
      ) : (
        <>
          {/* Summary Stats */}
          <StatsGrid columns={2}>
            <StatsCard icon={<DollarSign className="w-5 h-5" />} label="Total Balance" value={`AED ${fmtAed(stats.totalBalance)}`} gradient="from-red-500 to-rose-600" />
            <StatsCard icon={<Users className="w-5 h-5" />} label="Total Drivers" value={stats.totalDrivers} gradient="from-blue-500 to-indigo-600" />
            <StatsCard icon={<Wallet className="w-5 h-5" />} label="Avg per Driver" value={`AED ${fmtAed(stats.avgPerDriver)}`} gradient="from-amber-500 to-orange-600" />
            <StatsCard icon={<Shield className="w-5 h-5" />} label="Zero Balance" value={stats.zeroBalance} gradient="from-emerald-500 to-green-600" />
          </StatsGrid>

          <StatsGrid columns={2}>
            <StatsCard icon={<Car className="w-5 h-5" />} label="Total Accident" value={`AED ${fmtAed(stats.totalAccident)}`} gradient="from-red-600 to-red-700" />
            <StatsCard icon={<AlertTriangle className="w-5 h-5" />} label="Traffic Fines" value={`AED ${fmtAed(stats.totalTraffic)}`} gradient="from-yellow-500 to-amber-600" />
            <StatsCard icon={<Building2 className="w-5 h-5" />} label="SHJ RTA Fines" value={`AED ${fmtAed(stats.totalRTA)}`} gradient="from-indigo-500 to-violet-600" />
            <StatsCard icon={<DollarSign className="w-5 h-5" />} label="Internal & Misc" value={`AED ${fmtAed(stats.totalInternal > 0 ? stats.totalInternal : 0)}`} gradient="from-purple-500 to-fuchsia-600" />
          </StatsGrid>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">Fine Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={pieChartConfig} className="h-[250px] sm:h-[280px] w-full">
                  <PieChart>
                    <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" nameKey="name" label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {stats.pieData.map((_, index) => <Cell key={index} fill={PIE_COLORS[index]} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => `AED ${Number(value).toLocaleString("en-AE", { minimumFractionDigits: 2 })}`} />} />
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {stats.pieData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium text-foreground ml-auto">{((item.value / stats.totalBalance) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground">Driver Balance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] sm:h-[280px] w-full">
                  <BarChart data={stats.ranges}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} className="fill-muted-foreground" interval={0} />
                    <YAxis tick={{ fontSize: 9 }} className="fill-muted-foreground" width={35} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Drivers" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Trend Line Chart */}
          {trendData.length > 1 && (
            <Card className="bg-card border-border mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  📈 Balance Trend Over Time
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Comparing totals across {trendData.length} upload dates
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    totalBalance: { label: "Total Balance", color: "#ef4444" },
                    traffic: { label: "Traffic Fines", color: "#f59e0b" },
                    rta: { label: "SHJ RTA Fines", color: "#6366f1" },
                    accident: { label: "Accident", color: "#ec4899" },
                  }}
                  className="h-[250px] sm:h-[300px] w-full"
                >
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} className="fill-muted-foreground" interval={0} />
                    <YAxis tick={{ fontSize: 9 }} className="fill-muted-foreground" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} width={40} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            `AED ${Number(value).toLocaleString("en-AE", { minimumFractionDigits: 0 })}`
                          }
                        />
                      }
                    />
                    <Line type="monotone" dataKey="totalBalance" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} name="Total Balance" />
                    <Line type="monotone" dataKey="traffic" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Traffic Fines" />
                    <Line type="monotone" dataKey="rta" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="SHJ RTA Fines" />
                    <Line type="monotone" dataKey="accident" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} name="Accident" />
                  </LineChart>
                </ChartContainer>
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-3 justify-center">
                  {[
                    { label: "Total Balance", color: "#ef4444" },
                    { label: "Traffic Fines", color: "#f59e0b" },
                    { label: "SHJ RTA Fines", color: "#6366f1" },
                    { label: "Accident", color: "#ec4899" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-0.5 rounded" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {trendData.length <= 1 && !trendLoading && (
            <Card className="bg-card border-border mb-6">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground text-sm">📈 Trend chart will appear when data from multiple dates is available.</p>
              </CardContent>
            </Card>
          )}

          {/* External Fines Breakdown Table - On Road / Off Road / Total */}
          <Card className="bg-card border-border mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                📊 External Fines Breakdown by Fleet Status
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                On Road: {stats.onRoadCount} drivers · Off Road: {stats.offRoadCount} drivers
              </p>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th colSpan={2} className="text-left py-2 px-2 text-foreground font-bold border-r border-border bg-muted/30" />
                      <th colSpan={3} className="text-center py-2 px-2 font-bold text-blue-700 dark:text-blue-400 border-r border-border bg-blue-50 dark:bg-blue-950/30">
                        On Road
                      </th>
                      <th colSpan={3} className="text-center py-2 px-2 font-bold text-amber-700 dark:text-amber-400 border-r border-border bg-amber-50 dark:bg-amber-950/30">
                        Off Road
                      </th>
                      <th colSpan={3} className="text-center py-2 px-2 font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30">
                        Total
                      </th>
                    </tr>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left py-1.5 px-2 text-muted-foreground font-medium text-[10px] sm:text-xs">From</th>
                      <th className="text-left py-1.5 px-2 text-muted-foreground font-medium text-[10px] sm:text-xs border-r border-border">To</th>
                      <th className="text-right py-1.5 px-2 text-muted-foreground font-medium text-[10px] sm:text-xs">Count</th>
                      <th className="text-right py-1.5 px-2 text-blue-600 dark:text-blue-400 font-medium text-[10px] sm:text-xs italic">Ext. Fines</th>
                      <th className="text-right py-1.5 px-2 text-blue-600 dark:text-blue-400 font-medium text-[10px] sm:text-xs border-r border-border italic">Total Bal.</th>
                      <th className="text-right py-1.5 px-2 text-muted-foreground font-medium text-[10px] sm:text-xs">Count</th>
                      <th className="text-right py-1.5 px-2 text-amber-600 dark:text-amber-400 font-medium text-[10px] sm:text-xs italic">Ext. Fines</th>
                      <th className="text-right py-1.5 px-2 text-amber-600 dark:text-amber-400 font-medium text-[10px] sm:text-xs border-r border-border italic">Total Bal.</th>
                      <th className="text-right py-1.5 px-2 font-bold text-foreground text-[10px] sm:text-xs">Count</th>
                      <th className="text-right py-1.5 px-2 text-red-600 dark:text-red-400 font-medium text-[10px] sm:text-xs italic">Ext. Fines</th>
                      <th className="text-right py-1.5 px-2 text-red-600 dark:text-red-400 font-medium text-[10px] sm:text-xs italic">Total Bal.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FINE_RANGES.map((range, i) => (
                      <tr key={i} className={cn("border-b border-border/50 hover:bg-muted/20", stats.totalRanges[i].count === 0 && "opacity-40")}>
                        <td className="py-1.5 px-2 text-foreground">{range.label}</td>
                        <td className="py-1.5 px-2 text-foreground border-r border-border">{range.labelTo}</td>
                        {/* On Road */}
                        <td className="py-1.5 px-2 text-right font-medium text-foreground">
                          {stats.onRoadRanges[i].count > 0 ? (
                            <button onClick={() => setDrillDown({ rangeIndex: i, fleet: "onRoad" })} className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold">{fmtNum(stats.onRoadRanges[i].count)}</button>
                          ) : <span>0</span>}
                        </td>
                        <td className="py-1.5 px-2 text-right text-blue-600 dark:text-blue-400">{fmtNum(stats.onRoadRanges[i].extFines)}</td>
                        <td className="py-1.5 px-2 text-right text-blue-600 dark:text-blue-400 border-r border-border">{fmtNum(stats.onRoadRanges[i].totalOut)}</td>
                        {/* Off Road */}
                        <td className="py-1.5 px-2 text-right font-medium text-foreground">
                          {stats.offRoadRanges[i].count > 0 ? (
                            <button onClick={() => setDrillDown({ rangeIndex: i, fleet: "offRoad" })} className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-bold">{fmtNum(stats.offRoadRanges[i].count)}</button>
                          ) : <span>0</span>}
                        </td>
                        <td className="py-1.5 px-2 text-right text-amber-600 dark:text-amber-400">{fmtNum(stats.offRoadRanges[i].extFines)}</td>
                        <td className="py-1.5 px-2 text-right text-amber-600 dark:text-amber-400 border-r border-border">{fmtNum(stats.offRoadRanges[i].totalOut)}</td>
                        {/* Total */}
                        <td className="py-1.5 px-2 text-right font-bold text-foreground">
                          {stats.totalRanges[i].count > 0 ? (
                            <button onClick={() => setDrillDown({ rangeIndex: i, fleet: "total" })} className="text-red-600 dark:text-red-400 hover:underline cursor-pointer font-bold">{fmtNum(stats.totalRanges[i].count)}</button>
                          ) : <span>0</span>}
                        </td>
                        <td className="py-1.5 px-2 text-right text-red-600 dark:text-red-400">{fmtNum(stats.totalRanges[i].extFines)}</td>
                        <td className="py-1.5 px-2 text-right text-red-600 dark:text-red-400">{fmtNum(stats.totalRanges[i].totalOut)}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="border-t-2 border-border font-bold bg-muted/30">
                      <td colSpan={2} className="py-2 px-2 text-foreground border-r border-border">Total</td>
                      <td className="py-2 px-2 text-right text-foreground">{fmtNum(stats.onRoadCount)}</td>
                      <td className="py-2 px-2 text-right text-blue-600 dark:text-blue-400">{fmtNum(stats.onRoadRanges.reduce((s, r) => s + r.extFines, 0))}</td>
                      <td className="py-2 px-2 text-right text-blue-600 dark:text-blue-400 border-r border-border">{fmtNum(stats.onRoadRanges.reduce((s, r) => s + r.totalOut, 0))}</td>
                      <td className="py-2 px-2 text-right text-foreground">{fmtNum(stats.offRoadCount)}</td>
                      <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">{fmtNum(stats.offRoadRanges.reduce((s, r) => s + r.extFines, 0))}</td>
                      <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400 border-r border-border">{fmtNum(stats.offRoadRanges.reduce((s, r) => s + r.totalOut, 0))}</td>
                      <td className="py-2 px-2 text-right text-foreground">{fmtNum(stats.totalDrivers)}</td>
                      <td className="py-2 px-2 text-right text-red-600 dark:text-red-400">{fmtNum(stats.totalRanges.reduce((s, r) => s + r.extFines, 0))}</td>
                      <td className="py-2 px-2 text-right text-red-600 dark:text-red-400">{fmtNum(stats.totalRanges.reduce((s, r) => s + r.totalOut, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">💡 Key Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground text-sm">High Balance Alert</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {stats.ranges.find((r) => r.label === "20K+")?.count || 0} drivers have balance above AED 20,000.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground text-sm">Traffic Fines Dominant</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Traffic fines account for {((stats.totalTraffic / stats.totalBalance) * 100).toFixed(1)}% of total balance.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <ArrowDownRight className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground text-sm">Clear Drivers</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {stats.zeroBalance} drivers ({((stats.zeroBalance / stats.totalDrivers) * 100).toFixed(1)}%) have zero balance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Drill-Down Dialog */}
      <Dialog open={!!drillDown} onOpenChange={(open) => !open && setDrillDown(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              {drillDown && (
                <>
                  <Users className="w-4 h-4" />
                  {drillDown.fleet === "onRoad" ? "On Road" : drillDown.fleet === "offRoad" ? "Off Road" : "All"} Drivers
                  <span className="text-muted-foreground font-normal">
                    — External Fines {FINE_RANGES[drillDown.rangeIndex].label} to {FINE_RANGES[drillDown.rangeIndex].labelTo}
                  </span>
                  <span className="ml-auto text-sm text-muted-foreground">{drillDownDrivers.length} drivers</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Emp Code</th>
                  <th className="text-center py-2 px-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Accident</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Traffic</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">SHJ RTA</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Ext. Fines</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Total Bal.</th>
                </tr>
              </thead>
              <tbody>
                {drillDownDrivers.map((r, i) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-1.5 px-2 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="py-1.5 px-2 font-medium text-foreground">{r.emp_cde}</td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        r.fleet_status === "OnRoad"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      )}>
                        {r.fleet_status === "OnRoad" ? "On Road" : "Off Road"}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right text-foreground">{fmtAed(r.accident || 0)}</td>
                    <td className="py-1.5 px-2 text-right text-foreground">{fmtAed(r.traffic_fines || 0)}</td>
                    <td className="py-1.5 px-2 text-right text-foreground">{fmtAed(r.shj_rta_fines || 0)}</td>
                    <td className="py-1.5 px-2 text-right text-foreground font-medium">{fmtAed(r.total_external_fines || 0)}</td>
                    <td className="py-1.5 px-2 text-right font-bold text-red-600">{fmtAed(r.total_outstanding || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default TotalBalanceKPIPage;
