import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Car, Loader2, CheckCircle2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageLayout } from "@/components/shared/PageLayout";

interface YangoRecord {
  id: string;
  driver_id: string | null;
  driver_name: string | null;
  phone_type: string;
  has_data: string;
  created_at: string;
}


const PHONE_TYPES = ["Android", "iPhone"];
const DATA_OPTIONS = ["Yes", "No"];

const DriverYangoPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { driverInfo, loading: driverLoading } = useDriverCredentials();

  const [phoneType, setPhoneType] = useState("");
  const [hasData, setHasData] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [record, setRecord] = useState<YangoRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const fetchRecord = useCallback(async () => {
    const { data } = await supabase
      .from("yango_responses")
      .select("id, driver_id, driver_name, phone_type, has_data, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRecord((data as YangoRecord) || null);
    setLoading(false);
  }, []);


  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleSubmit = async () => {
    if (!phoneType) {
      toast.error("Please select your type of smartphone.");
      return;
    }
    if (!hasData) {
      toast.error("Please answer if you have monthly data.");
      return;
    }
    if (!driverInfo?.driverId) {
      toast.error("Driver ID is still loading. Please wait a moment.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || user?.id;
      if (!userId) throw new Error("Not authenticated.");

      const submittedAt = new Date().toISOString();
      const { error } = await supabase.from("yango_responses").insert({
        user_id: userId,
        driver_id: driverInfo.driverId,
        driver_name: driverInfo.driverName || null,
        phone_type: phoneType,
        has_data: hasData,
        created_at: submittedAt,
      });
      if (error) {
        if ((error as any).code === "23505") {
          toast.error("You have already submitted your Yango details.");
          await fetchRecord();
          return;
        }
        throw error;
      }
      toast.success(
        `Submitted. Driver ID: ${driverInfo.driverId} at ${format(
          new Date(submittedAt),
          "dd MMM yyyy • hh:mm a"
        )}`
      );
      await fetchRecord();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <PageLayout
      title="Yango"
      icon={<Car className="h-6 w-6" />}
      backPath="/driver-portal"
      backLabel="Back"
      maxWidth="2xl"
      variant="dark"
      gradient="from-slate-900 via-purple-900 to-slate-900"
    >
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-400/30 rounded-2xl p-5 mb-5 text-center">
        <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
          To Work with YANGO you have your own Smart Phone and DATA
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
        </div>
      ) : record ? (
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 flex flex-col items-center text-center gap-2">
          <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Already submitted</h2>
          <p className="text-sm text-white/70">
            {record.phone_type} • Monthly Data: {record.has_data}
          </p>
          <p className="text-sm text-white/80 font-medium">
            Driver ID: {record.driver_id || "—"}
          </p>
          <p className="text-xs text-white/40">
            {format(new Date(record.created_at), "dd MMM yyyy • hh:mm a")}
          </p>
        </div>

      ) : (
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 sm:p-6 space-y-5">
          <div>
            <label className="text-sm text-white/70 mb-2 block">1. Select type of smartphone</label>
            <div className="grid grid-cols-2 gap-3">
              {PHONE_TYPES.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPhoneType(opt)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-4 border transition-colors ${
                    phoneType === opt
                      ? "bg-violet-500/25 border-violet-400 text-white"
                      : "bg-white/5 border-white/15 text-white/80 hover:bg-white/10"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="font-medium">{opt}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-white/70 mb-2 block">2. Do you have monthly DATA?</label>
            <div className="grid grid-cols-2 gap-3">
              {DATA_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setHasData(opt)}
                  className={`rounded-xl px-4 py-4 border font-medium transition-colors ${
                    hasData === opt
                      ? "bg-emerald-500/25 border-emerald-400 text-white"
                      : "bg-white/5 border-white/15 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || driverLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      )}
    </PageLayout>
  );
};

export default DriverYangoPage;
