import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ClipboardList, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageLayout } from "@/components/shared/PageLayout";

interface SurveyRecord {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

interface SurveyQuestion {
  id: string;
  question: string;
  options: string[];
}

const DriverSurveyPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { driverInfo, loading: driverLoading } = useDriverCredentials();

  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [records, setRecords] = useState<SurveyRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const fetchRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from("driver_surveys")
      .select("id, question, answer, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error) setRecords((data as SurveyRecord[]) || []);
    setLoadingRecords(false);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("survey_questions")
        .select("id, question, options")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setQuestions(
        (data || []).map((q: any) => ({
          id: q.id,
          question: q.question,
          options: Array.isArray(q.options) ? q.options : [],
        }))
      );
      setLoadingQuestions(false);
    };
    load();
  }, []);

  const handleSubmit = async (q: SurveyQuestion) => {
    if (records.some((r) => r.question === q.question)) {
      toast.error("You have already submitted the survey.");
      return;
    }
    const answer = selected[q.id];
    if (!answer) {
      toast.error("Please select one option.");
      return;
    }
    setSubmitting(q.id);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || user?.id;
      if (!userId) throw new Error("Not authenticated.");

      const { error } = await supabase.from("driver_surveys").insert({
        user_id: userId,
        driver_id: driverInfo?.driverId || null,
        driver_name: driverInfo?.driverName || null,
        question: q.question,
        answer,
      });
      if (error) {
        if ((error as any).code === "23505") {
          toast.error("You have already submitted this survey.");
          await fetchRecords();
          return;
        }
        throw error;
      }

      toast.success("Survey submitted. Thank you!");
      setSelected((prev) => ({ ...prev, [q.id]: "" }));
      await fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit survey.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <PageLayout
      title="Survey"
      icon={<ClipboardList className="h-6 w-6" />}
      backPath="/driver-portal"
      backLabel="Back"
      maxWidth="2xl"
      variant="dark"
      gradient="from-slate-900 via-purple-900 to-slate-900"
    >
      {loadingQuestions || loadingRecords ? (
        <div className="flex items-center justify-center py-12 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading survey...
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white/10 border border-white/20 rounded-2xl p-6 mb-6 text-center text-white/60 text-sm">
          No survey is available right now.
        </div>
      ) : questions.every((q) => records.some((r) => r.question === q.question)) ? (
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6 flex flex-col items-center text-center gap-2">
          <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Survey already submitted</h2>
          <p className="text-sm text-white/60">
            You answered "{records[0].answer}" on{" "}
            {format(new Date(records[0].created_at), "dd MMM yyyy • hh:mm a")}.
          </p>
          <p className="text-xs text-white/40">Each driver can submit the survey only once.</p>
        </div>
      ) : (
        questions
          .filter((q) => !records.some((r) => r.question === q.question))
          .map((q) => (
            <div
              key={q.id}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 sm:p-6 mb-4 space-y-4"
            >
              <div>
                <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Question</p>
                <h2 className="text-lg font-semibold text-white">{q.question}</h2>
                <p className="text-xs text-white/50 mt-1">Select only one option.</p>
              </div>

              <div className="space-y-3">
                {q.options.map((opt) => {
                  const active = selected[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelected((prev) => ({ ...prev, [q.id]: opt }))}
                      className={`w-full flex items-center justify-between rounded-xl px-4 py-4 border transition-colors text-left ${
                        active
                          ? "bg-violet-500/25 border-violet-400 text-white"
                          : "bg-white/5 border-white/15 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <span className="font-medium">{opt}</span>
                      {active && <CheckCircle2 className="w-5 h-5 text-violet-300" />}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={() => handleSubmit(q)}
                disabled={!selected[q.id] || submitting === q.id || driverLoading}
                className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-semibold"
              >
                {submitting === q.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitting === q.id ? "Submitting..." : "Submit"}
              </Button>
            </div>
        ))
      )}

      {records.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white/80">My Submissions</h2>
          {records.map((rec) => (
            <div
              key={rec.id}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4"
            >
              <p className="text-white font-semibold text-sm">{rec.answer}</p>
              <p className="text-white/50 text-xs">
                {rec.question} • {format(new Date(rec.created_at), "dd MMM yyyy • hh:mm a")}
              </p>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default DriverSurveyPage;
