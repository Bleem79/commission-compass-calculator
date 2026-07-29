import { useMemo } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { BarChart3 } from "lucide-react";

export interface AnalyticsRecord {
  driver_id: string | null;
  question: string;
  answer: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: AnalyticsRecord[];
}

const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#6366f1"];

export const SurveyAnalyticsDialog = ({ open, onOpenChange, records }: Props) => {
  const stats = useMemo(() => {
    const total = records.length;
    const drivers = new Set(records.map((r) => r.driver_id || "—")).size;

    const byQuestion = new Map<string, Map<string, number>>();
    const byDay = new Map<string, number>();

    records.forEach((r) => {
      if (!byQuestion.has(r.question)) byQuestion.set(r.question, new Map());
      const m = byQuestion.get(r.question)!;
      m.set(r.answer, (m.get(r.answer) || 0) + 1);
      const d = format(new Date(r.created_at), "yyyy-MM-dd");
      byDay.set(d, (byDay.get(d) || 0) + 1);
    });

    const questions = Array.from(byQuestion.entries()).map(([question, answers]) => {
      const data = Array.from(answers.entries())
        .map(([answer, count]) => ({ answer, count }))
        .sort((a, b) => b.count - a.count);
      const qTotal = data.reduce((s, d) => s + d.count, 0);
      return { question, data, qTotal, top: data[0] };
    });

    const trend = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, count]) => ({ day: format(new Date(day), "dd MMM"), count }));

    const firstDate = records.length
      ? records.map((r) => new Date(r.created_at).getTime()).sort((a, b) => a - b)[0]
      : null;

    return { total, drivers, questions, trend, firstDate };
  }, [records]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Survey Analysis
          </DialogTitle>
          <DialogDescription>
            Graphical and statistical breakdown of the current (filtered) survey submissions.
          </DialogDescription>
        </DialogHeader>

        {stats.total === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">No data to analyse.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Responses", value: stats.total },
                { label: "Unique Drivers", value: stats.drivers },
                { label: "Questions", value: stats.questions.length },
                {
                  label: "Since",
                  value: stats.firstDate ? format(new Date(stats.firstDate), "dd MMM yy") : "—",
                },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>

            {stats.questions.map((q, qi) => (
              <div key={q.question} className="rounded-xl border p-4 space-y-3">
                <div>
                  <p className="font-semibold text-sm">{q.question}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.qTotal} response{q.qTotal !== 1 ? "s" : ""}
                    {q.top && (
                      <> · Most chosen: <span className="font-medium text-foreground">{q.top.answer}</span>{" "}
                      ({((q.top.count / q.qTotal) * 100).toFixed(1)}%)</>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={q.data} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis type="number" allowDecimals={false} fontSize={11} />
                        <YAxis type="category" dataKey="answer" width={110} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                          {q.data.map((_, i) => (
                            <Cell key={i} fill={COLORS[(i + qi) % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={q.data}
                          dataKey="count"
                          nameKey="answer"
                          outerRadius={70}
                          label={(e: any) => `${((e.count / q.qTotal) * 100).toFixed(0)}%`}
                        >
                          {q.data.map((_, i) => (
                            <Cell key={i} fill={COLORS[(i + qi) % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {q.data.map((d, i) => {
                    const pct = (d.count / q.qTotal) * 100;
                    return (
                      <div key={d.answer} className="text-xs">
                        <div className="flex justify-between mb-0.5">
                          <span>{d.answer}</span>
                          <span className="text-muted-foreground">
                            {d.count} · {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: COLORS[(i + qi) % COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="rounded-xl border p-4">
              <p className="font-semibold text-sm mb-2">Submissions Over Time</p>
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};