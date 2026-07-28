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

const QUESTION = "Cashier Timings";
const OPTIONS = ["06:00 AM - 06:00 PM", "04:00 AM - 04:00 PM"];

interface SurveyRecord {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

const DriverSurveyPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { driverInfo, loading: driverLoading } = useDriverCredentials();

  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState<SurveyRecord[]>([]);

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
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = async () => {
    if (!selected) {
      toast.error("Please select one option.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || user?.id;
      if (!userId) throw new Error("Not authenticated.");

      const { error } = await supabase.from("driver_surveys").insert({
        user_id: userId,
        driver_id: driverInfo?.driverId || null,
        driver_name: driverInfo?.driverName || null,
        question: QUESTION,
        answer: selected,
      });
      if (error) throw error;

      toast.success("Survey submitted. Thank you!");
      setSelected(null);
      await fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit survey.");
    } finally {
      setSubmitting(false);
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
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 sm:p-6 mb-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Question</p>
          <h2 className="text-lg font-semibold text-white">{QUESTION}</h2>
          <p className="text-xs text-white/50 mt-1">Select only one option.</p>
        </div>

        <div className="space-y-3">
          {OPTIONS.map((opt) => {
            const active = selected === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSelected(opt)}
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
          onClick={handleSubmit}
          disabled={!selected || submitting || driverLoading}
          className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-semibold"
        >
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </div>

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
