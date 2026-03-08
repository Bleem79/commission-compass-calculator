import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X, FileWarning, TrendingUp, TrendingDown, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

interface BookingRecord {
  id: string;
  date: string; // month
  driver_id: string;
  name: string | null;
  action_taken: string; // Offer:X|Accept:Y|Reject:Z
  reasons: string | null;
}

interface ParsedRecord {
  month: string;
  offer: number;
  accept: number;
  reject: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatMonth = (dateStr: string): string => {
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return `${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const parseActionTaken = (action: string): { offer: number; accept: number; reject: number } => {
  const parts = action.split("|");
  let offer = 0, accept = 0, reject = 0;
  for (const p of parts) {
    const [key, val] = p.split(":");
    const num = parseInt(val, 10) || 0;
    if (key?.trim().toLowerCase() === "offer") offer = num;
    else if (key?.trim().toLowerCase() === "accept") accept = num;
    else if (key?.trim().toLowerCase() === "reject") reject = num;
  }
  return { offer, accept, reject };
};

const COLORS = ["hsl(142, 76%, 36%)", "hsl(0, 84%, 60%)", "hsl(221, 83%, 53%)"];

const DriverWarningLetterPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { driverInfo } = useDriverCredentials();
  const [records, setRecords] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const fetchRecords = useCallback(async () => {
    if (!driverInfo?.driverId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("warning_letters")
        .select("id, date, driver_id, name, action_taken, reasons")
        .eq("driver_id", driverInfo.driverId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setRecords((data as BookingRecord[]) || []);
    } catch (err) {
      console.error("Error fetching booking rejection data:", err);
    } finally {
      setLoading(false);
    }
  }, [driverInfo?.driverId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const parsed: ParsedRecord[] = useMemo(() => {
    const monthMap = new Map<string, { offer: number; accept: number; reject: number }>();
    records.forEach((r) => {
      const { offer, accept, reject } = parseActionTaken(r.action_taken);
      const month = formatMonth(r.date || "Unknown");
      const existing = monthMap.get(month);
      if (existing) {
        existing.offer += offer;
        existing.accept += accept;
        existing.reject += reject;
      } else {
        monthMap.set(month, { offer, accept, reject });
      }
    });
    return Array.from(monthMap.entries()).map(([month, vals]) => ({
      month,
      ...vals,
    }));
  }, [records]);

  const totals = useMemo(() => {
    const t = { offer: 0, accept: 0, reject: 0 };
    parsed.forEach((p) => { t.offer += p.offer; t.accept += p.accept; t.reject += p.reject; });
    return t;
  }, [parsed]);

  const acceptRate = totals.offer > 0 ? ((totals.accept / totals.offer) * 100).toFixed(1) : "0.0";
  const rejectRate = totals.offer > 0 ? ((totals.reject / totals.offer) * 100).toFixed(1) : "0.0";

  const chartData = useMemo(() => {
    return parsed.map((p) => ({
      month: p.month,
      Offer: p.offer,
      Accept: p.accept,
      Reject: p.reject,
      "Accept %": p.offer > 0 ? Math.round((p.accept / p.offer) * 100) : 0,
      "Reject %": p.offer > 0 ? Math.round((p.reject / p.offer) * 100) : 0,
    }));
  }, [parsed]);

  const pieData = useMemo(() => [
    { name: "Accepted", value: totals.accept },
    { name: "Rejected", value: totals.reject },
  ], [totals]);

  const handleClose = () => navigate("/driver-portal");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-rose-50/50 to-orange-50/50 p-4 sm:p-6">
      <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10" onClick={handleClose}>
        <X className="h-6 w-6 text-muted-foreground hover:text-foreground" />
      </Button>

      <Button
        variant="outline"
        className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-background hover:bg-accent text-primary border-border"
        onClick={handleClose}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Portal</span>
      </Button>

      <div className="max-w-5xl mx-auto pt-16 space-y-6">
        <div className="flex items-center gap-3">
          <FileWarning className="h-8 w-8 text-rose-600" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Booking Rejection</h1>
            <p className="text-sm text-muted-foreground">
              {driverInfo?.driverId ? `Driver: ${driverInfo.driverId}` : "Your booking stats"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        ) : parsed.length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Data Available</h2>
              <p className="text-muted-foreground">Booking rejection data has not been uploaded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card className="border-blue-200 bg-blue-50/80">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-blue-600 font-medium">Total Offers</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-700">{totals.offer}</p>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50/80">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-green-600 font-medium">Accepted</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-700">{totals.accept}</p>
                  <p className="text-xs text-green-500 flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3" />{acceptRate}%
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50/80">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-red-600 font-medium">Rejected</p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-700">{totals.reject}</p>
                  <p className="text-xs text-red-500 flex items-center justify-center gap-1 mt-1">
                    <TrendingDown className="h-3 w-3" />{rejectRate}%
                  </p>
                </CardContent>
              </Card>
              <Card className="border-purple-200 bg-purple-50/80">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-purple-600 font-medium">Months</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-700">{parsed.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Bar Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Offer" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Accept" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Reject" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pie Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Accept vs Reject</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Trend Line */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Acceptance Rate Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="Accept %" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="Reject %" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Detailed Monthly Data</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="p-2 font-semibold">Month</th>
                      <th className="p-2 font-semibold text-center">Offer</th>
                      <th className="p-2 font-semibold text-center">Accept</th>
                      <th className="p-2 font-semibold text-center">Reject</th>
                      <th className="p-2 font-semibold text-center">Accept %</th>
                      <th className="p-2 font-semibold text-center">Reject %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row, i) => {
                      const aRate = row.offer > 0 ? ((row.accept / row.offer) * 100).toFixed(1) : "0.0";
                      const rRate = row.offer > 0 ? ((row.reject / row.offer) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={i} className="border-b border-border hover:bg-muted/50">
                          <td className="p-2 font-medium">{row.month}</td>
                          <td className="p-2 text-center text-blue-600 font-semibold">{row.offer}</td>
                          <td className="p-2 text-center text-green-600 font-semibold">{row.accept}</td>
                          <td className="p-2 text-center text-red-600 font-semibold">{row.reject}</td>
                          <td className="p-2 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              {aRate}%
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                              {rRate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totals row */}
                    <tr className="bg-muted/70 font-bold">
                      <td className="p-2">Total</td>
                      <td className="p-2 text-center text-blue-700">{totals.offer}</td>
                      <td className="p-2 text-center text-green-700">{totals.accept}</td>
                      <td className="p-2 text-center text-red-700">{totals.reject}</td>
                      <td className="p-2 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-200 text-green-800 text-xs">
                          {acceptRate}%
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-200 text-red-800 text-xs">
                          {rejectRate}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default DriverWarningLetterPage;
