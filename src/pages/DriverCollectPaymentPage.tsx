import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { CreditCard, QrCode, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverCredentials } from "@/hooks/useDriverCredentials";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageLayout } from "@/components/shared/PageLayout";

interface CollectionRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  checkout_url: string | null;
  created_at: string;
}

const formatAmount = (value: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const DriverCollectPaymentPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { driverInfo, loading: driverLoading } = useDriverCredentials();

  const [amount, setAmount] = useState("");
  const [now, setNow] = useState(new Date());
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ amount: number; url: string; at: Date } | null>(null);
  const [records, setRecords] = useState<CollectionRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  const parsedAmount = parseFloat(amount);
  const hasValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("payment_collections")
        .select("id, amount, currency, status, checkout_url, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setRecords((data as CollectionRecord[]) || []);
    } catch (err) {
      console.error("Error fetching collections:", err);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleGenerate = async () => {
    if (!hasValidAmount) {
      toast.error("Please enter a valid amount.");
      return;
    }
    const driverId = driverInfo?.driverId;
    if (!driverId) {
      toast.error("Driver ID not found. Please try again.");
      return;
    }

    setGenerating(true);
    try {
      const generatedAt = new Date();
      // PROTOTYPE: placeholder payment link (Stripe checkout will replace this later).
      const placeholderUrl = `https://pay.amantaxillc.com/preview?driver=${encodeURIComponent(
        driverId,
      )}&amount=${parsedAmount.toFixed(2)}&t=${generatedAt.getTime()}`;

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || user?.id;

      if (userId) {
        const { error } = await supabase.from("payment_collections").insert({
          user_id: userId,
          driver_id: driverId,
          driver_name: driverInfo?.driverName || null,
          amount: parsedAmount,
          currency: "AED",
          status: "pending",
          checkout_url: placeholderUrl,
        });
        if (error) throw error;
      }

      setGenerated({ amount: parsedAmount, url: placeholderUrl, at: generatedAt });
      setAmount("");
      toast.success("QR code generated.");
      await fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate QR code.");
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) =>
    status === "paid" ? (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Paid</Badge>
    ) : (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">Pending</Badge>
    );

  return (
    <PageLayout
      title="Collect Payment"
      icon={<CreditCard className="h-6 w-6" />}
      backPath="/driver-portal"
      backLabel="Back"
      maxWidth="2xl"
      variant="dark"
      gradient="from-slate-900 via-purple-900 to-slate-900"
    >
      {/* Amount entry */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 sm:p-6 mb-6 space-y-4">
        <div>
          <label className="text-sm text-white/70 mb-2 block">Amount (AED)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 font-semibold text-sm">
              AED
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="0.00"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 pl-14 text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* Auto date & time */}
        <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
          <span className="text-xs uppercase tracking-widest text-white/50">Date &amp; Time</span>
          <span className="text-sm font-medium text-white/80">
            {format(now, "dd MMM yyyy  •  hh:mm:ss a")}
          </span>
        </div>

        {/* Generate button - only shows once a valid amount is entered */}
        {hasValidAmount && (
          <Button
            onClick={handleGenerate}
            disabled={driverLoading || generating}
            className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-semibold"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4 mr-2" />
            )}
            {generating ? "Generating..." : "Generate QR Code"}
          </Button>
        )}
      </div>

      {/* Generated QR */}
      {generated && (
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6 flex flex-col items-center gap-5">
          <div className="p-1 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-400 to-blue-500 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
            <div className="bg-white rounded-xl p-4 flex items-center justify-center">
              <QRCodeCanvas
                value={generated.url}
                size={220}
                level="M"
                bgColor="#ffffff"
                fgColor="#1e1b4b"
                includeMargin={true}
              />
            </div>
          </div>

          <p className="text-xs text-center text-white/50 max-w-xs">
            Ask the customer to scan this code to pay.
          </p>

          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-widest text-white/50">Total Amount</p>
            <p className="text-3xl font-bold tracking-wider text-white">
              AED {formatAmount(generated.amount)}
            </p>
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-widest text-white/50">Date &amp; Time</p>
            <p className="text-sm font-medium text-white/80">
              {format(generated.at, "dd MMM yyyy  •  hh:mm:ss a")}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setGenerated(null)}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            New Payment
          </Button>
        </div>
      )}

      {/* History */}
      {records.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white/80">Submitted Collections</h2>
          {records.map((rec) => (
            <div
              key={rec.id}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm">
                        AED {formatAmount(Number(rec.amount))}
                      </p>
                      {getStatusBadge(rec.status)}
                    </div>
                    <p className="text-white/50 text-xs">
                      {format(new Date(rec.created_at), "dd MMM yyyy • hh:mm a")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {records.length === 0 && !loadingRecords && !generated && (
        <div className="flex-1 flex flex-col items-center justify-center text-white/40 gap-3 py-12">
          <CreditCard className="w-12 h-12" />
          <p className="text-sm">No payments yet. Enter an amount above to start.</p>
        </div>
      )}
    </PageLayout>
  );
};

export default DriverCollectPaymentPage;