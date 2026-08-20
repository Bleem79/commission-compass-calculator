import { useMemo } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { BarChart3, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface YangoAnalyticsRecord {
  driver_id: string | null;
  phone_type: string;
  has_data: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: YangoAnalyticsRecord[];
}

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899"];

const toChart = (map: Map<string, number>) =>
  Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

export const YangoAnalyticsDialog = ({ open, onOpenChange, records }: Props) => {
  const stats = useMemo(() => {
    const total = records.length;
    const drivers = new Set(records.map((r) => r.driver_id || "—")).size;

    const phone = new Map<string, number>();
    const data = new Map<string, number>();
    const combo = new Map<string, number>();
    const byDay = new Map<string, number>();

    records.forEach((r) => {
      phone.set(r.phone_type, (phone.get(r.phone_type) || 0) + 1);
      data.set(r.has_data, (data.get(r.has_data) || 0) + 1);
      const key = `${r.phone_type} · Data: ${r.has_data}`;
      combo.set(key, (combo.get(key) || 0) + 1);
      const d = format(new Date(r.created_at), "yyyy-MM-dd");
      byDay.set(d, (byDay.get(d) || 0) + 1);
    });

    const trendRaw = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const trend = trendRaw.map(([day, count]) => ({ day: format(new Date(day), "dd MMM"), count }));

    let running = 0;
    const cumulative = trendRaw.map(([day, count]) => {
      running += count;
      return { day: format(new Date(day), "dd MMM"), total: running };
    });

    const eligible = records.filter((r) => r.has_data === "Yes").length;
    const firstDate = records.length
      ? records.map((r) => new Date(r.created_at).getTime()).sort((a, b) => a - b)[0]
      : null;
    const days = byDay.size || 1;

    return {
      total,
      drivers,
      eligible,
      eligiblePct: total ? (eligible / total) * 100 : 0,
      phone: toChart(phone),
      data: toChart(data),
      combo: toChart(combo),
      trend,
      cumulative,
      avgPerDay: total / days,
      peak: trend.length ? trend.reduce((a, b) => (b.count > a.count ? b : a)) : null,
      firstDate,
    };
  }, [records]);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border p-4 space-y-3">
      <p className="font-semibold text-sm">{title}</p>
      {children}
    </div>
  );

  const Breakdown = ({ data, offset = 0 }: { data: { name: string; count: number }[]; offset?: number }) => {
    const sum = data.reduce((s, d) => s + d.count, 0) || 1;
    return (
      <div className="space-y-1.5">
        {data.map((d, i) => {
          const pct = (d.count / sum) * 100;
          return (
            <div key={d.name} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span>{d.name}</span>
                <span className="text-muted-foreground">{d.count} · {pct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[(i + offset) % COLORS.length] }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[210mm] max-w-[210mm] max-h-[90vh] overflow-y-auto p-[12mm] print:max-h-none print:overflow-visible">
        <style>{`@media print {
          @page { size: A4 portrait; margin: 10mm; }
          body * { visibility: hidden !important; }
          [data-yango-report], [data-yango-report] * { visibility: visible !important; }
          [data-yango-report] {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 190mm !important; max-width: 190mm !important;
            transform: none !important; box-shadow: none !important; border: none !important;
            padding: 0 !important; margin: 0 !important;
          }
        }`}</style>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Yango Analysis
          </DialogTitle>
          <DialogDescription>
            Graphical and statistical breakdown of the current (filtered) Yango submissions.
          </DialogDescription>
        </DialogHeader>

        {stats.total === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">No data to analyse.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Submissions", value: stats.total },
                { label: "Unique Drivers", value: stats.drivers },
                { label: "With Data", value: `${stats.eligible} (${stats.eligiblePct.toFixed(0)}%)` },
                { label: "Avg / Day", value: stats.avgPerDay.toFixed(1) },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>

            <Section title="Smartphone Type">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.phone} dataKey="count" nameKey="name" outerRadius={70}
                        label={(e: any) => `${((e.count / stats.total) * 100).toFixed(0)}%`}>
                        {stats.phone.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <Breakdown data={stats.phone} />
              </div>
            </Section>

            <Section title="Monthly Data Availability">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.data} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" allowDecimals={false} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={70} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {stats.data.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Breakdown data={stats.data} offset={2} />
              </div>
            </Section>

            <Section title="Phone × Data Combination">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.combo} margin={{ left: 8, right: 16, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {stats.combo.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="Submissions Over Time">
              <p className="text-xs text-muted-foreground -mt-2">
                {stats.peak && <>Peak day: <span className="font-medium text-foreground">{stats.peak.day}</span> ({stats.peak.count})</>}
                {stats.firstDate && <> · Since {format(new Date(stats.firstDate), "dd MMM yyyy")}</>}
              </p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.trend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section title="Cumulative Submissions">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.cumulative}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="day" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};