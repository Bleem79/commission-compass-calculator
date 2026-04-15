import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { PageLayout } from "@/components/shared/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard, StatsGrid } from "@/components/shared/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
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
  ResponsiveContainer,
  Tooltip,
  Legend,
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OutstandingRecord {
  id: string;
  emp_cde: string;
  accident: number | null;
  traffic_fines: number | null;
  shj_rta_fines: number | null;
  total_external_fines: number | null;
  total_outstanding: number | null;
  created_at: string;
}

const PIE_COLORS = ["#ef4444", "#f59e0b", "#6366f1", "#8b5cf6"];

const TotalBalanceKPIPage = () => {
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [records, setRecords] = useState<OutstandingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Paginate to get all records
        let allRecords: OutstandingRecord[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from("total_outstanding")
            .select("*")
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
    if (isAdmin) fetchData();
  }, [isAdmin]);

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

    // Distribution by range
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

    // Top 10 highest balance drivers
    const top10 = [...records]
      .sort((a, b) => (b.total_outstanding || 0) - (a.total_outstanding || 0))
      .slice(0, 10);

    // Zero balance drivers
    const zeroBalance = records.filter((r) => (r.total_outstanding || 0) === 0).length;

    // Pie chart data for fine categories
    const pieData = [
      { name: "Accident", value: totalAccident },
      { name: "Traffic Fines", value: totalTraffic },
      { name: "SHJ RTA Fines", value: totalRTA },
      { name: "Internal & Misc", value: totalInternal > 0 ? totalInternal : 0 },
    ];

    return {
      totalDrivers,
      totalBalance,
      totalAccident,
      totalTraffic,
      totalRTA,
      totalExternal,
      totalInternal,
      avgPerDriver,
      ranges,
      top10,
      zeroBalance,
      pieData,
    };
  }, [records]);

  if (adminLoading || loading) {
    return (
      <PageLayout title="Total Balance KPI" icon={<TrendingUp className="w-6 h-6" />} backPath="/home">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </PageLayout>
    );
  }

  if (!stats) {
    return (
      <PageLayout title="Total Balance KPI" icon={<TrendingUp className="w-6 h-6" />} backPath="/home">
        <p className="text-muted-foreground text-center py-10">No data available.</p>
      </PageLayout>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const chartConfig = {
    count: { label: "Drivers", color: "hsl(var(--primary))" },
  };

  const pieChartConfig = {
    Accident: { label: "Accident", color: "#ef4444" },
    "Traffic Fines": { label: "Traffic Fines", color: "#f59e0b" },
    "SHJ RTA Fines": { label: "SHJ RTA Fines", color: "#6366f1" },
    "Internal & Misc": { label: "Internal & Misc", color: "#8b5cf6" },
  };

  return (
    <PageLayout
      title="Total Balance KPI"
      icon={<TrendingUp className="w-6 h-6" />}
      backPath="/home"
    >
      {/* Summary Stats */}
      <StatsGrid columns={4}>
        <StatsCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Balance"
          value={`AED ${fmt(stats.totalBalance)}`}
          gradient="from-red-500 to-rose-600"
        />
        <StatsCard
          icon={<Users className="w-5 h-5" />}
          label="Total Drivers"
          value={stats.totalDrivers}
          gradient="from-blue-500 to-indigo-600"
        />
        <StatsCard
          icon={<Wallet className="w-5 h-5" />}
          label="Avg per Driver"
          value={`AED ${fmt(stats.avgPerDriver)}`}
          gradient="from-amber-500 to-orange-600"
        />
        <StatsCard
          icon={<Shield className="w-5 h-5" />}
          label="Zero Balance"
          value={stats.zeroBalance}
          gradient="from-emerald-500 to-green-600"
        />
      </StatsGrid>

      {/* Category Breakdown Stats */}
      <StatsGrid columns={4}>
        <StatsCard
          icon={<Car className="w-5 h-5" />}
          label="Total Accident"
          value={`AED ${fmt(stats.totalAccident)}`}
          gradient="from-red-600 to-red-700"
        />
        <StatsCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Traffic Fines"
          value={`AED ${fmt(stats.totalTraffic)}`}
          gradient="from-yellow-500 to-amber-600"
        />
        <StatsCard
          icon={<Building2 className="w-5 h-5" />}
          label="SHJ RTA Fines"
          value={`AED ${fmt(stats.totalRTA)}`}
          gradient="from-indigo-500 to-violet-600"
        />
        <StatsCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Internal & Misc"
          value={`AED ${fmt(stats.totalInternal > 0 ? stats.totalInternal : 0)}`}
          gradient="from-purple-500 to-fuchsia-600"
        />
      </StatsGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Pie Chart - Fine Category Distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Fine Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieChartConfig} className="h-[280px] w-full">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {stats.pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        `AED ${Number(value).toLocaleString("en-AE", { minimumFractionDigits: 2 })}`
                      }
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {stats.pieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium text-foreground ml-auto">
                    {((item.value / stats.totalBalance) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart - Balance Distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-foreground">
              Driver Balance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={stats.ranges}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                  name="Drivers"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Highest Balance Drivers */}
      <Card className="bg-card border-border mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-red-500" />
            Top 10 Highest Balance Drivers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Emp Code</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Accident</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Traffic</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">SHJ RTA</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Total Balance</th>
                </tr>
              </thead>
              <tbody>
                {stats.top10.map((r, i) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-2 font-medium text-foreground">{r.emp_cde}</td>
                    <td className="py-2 px-2 text-right text-foreground">
                      {(r.accident || 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground">
                      {(r.traffic_fines || 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-right text-foreground">
                      {(r.shj_rta_fines || 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-red-600">
                      {(r.total_outstanding || 0).toLocaleString("en-AE", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            💡 Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground text-sm">High Balance Alert</p>
              <p className="text-muted-foreground text-xs mt-1">
                {stats.ranges.find((r) => r.label === "20K+")?.count || 0} drivers have
                outstanding balance above AED 20,000. Immediate follow-up recommended.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <TrendingUp className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground text-sm">Traffic Fines Dominant</p>
              <p className="text-muted-foreground text-xs mt-1">
                Traffic fines account for{" "}
                {((stats.totalTraffic / stats.totalBalance) * 100).toFixed(1)}% of the
                total outstanding balance — the largest single category.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <ArrowDownRight className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground text-sm">Clear Drivers</p>
              <p className="text-muted-foreground text-xs mt-1">
                {stats.zeroBalance} drivers ({((stats.zeroBalance / stats.totalDrivers) * 100).toFixed(1)}%)
                have zero outstanding balance — well done!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default TotalBalanceKPIPage;
