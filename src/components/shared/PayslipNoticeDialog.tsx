import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CircleAlert, DollarSign, KeyRound, X } from "lucide-react";

export const PAYSLIP_URL =
  "https://script.google.com/macros/s/AKfycbw0pUkyfnFps_fPjjPKdK0IgDKH6rAYwaMaFrGXuw2vlEYz7mHkKMADO5ojlmEOjEjZVg/exec";

const NOTICE_MS = 5000;

interface PayslipNoticeDialogProps {
  open: boolean;
  onClose: () => void;
  url?: string;
}

/**
 * Full-screen flash notice shown when a driver taps "Payslip".
 * Stays up for ~5 seconds telling the driver which credentials to use.
 * The payslip page is NEVER opened automatically — it only opens when the
 * driver taps the "Open Payslip" button.
 */
export const PayslipNoticeDialog = ({
  open,
  onClose,
  url = PAYSLIP_URL,
}: PayslipNoticeDialogProps) => {
  const [progress, setProgress] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [shown, setShown] = useState(false);
  const [awaitingTap, setAwaitingTap] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);

  const launch = useCallback(() => {
    // Use a real link click so the browser treats it as a user gesture.
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    onClose();
  }, [url, onClose]);

  useEffect(() => {
    if (!open) return;

    setProgress(100);
    setSecondsLeft(5);
    setAwaitingTap(false);
    setShown(false);

    rafRef.current = requestAnimationFrame(() => setShown(true));

    const start = Date.now();
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, NOTICE_MS - (Date.now() - start));
      setProgress((remaining / NOTICE_MS) * 100);
      setSecondsLeft(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        // Countdown finished: keep the notice on screen and wait for a tap.
        setAwaitingTap(true);
      }
    }, 80);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Payslip access instructions"
      className="fixed inset-0 z-[100] flex items-center justify-center p-5"
    >
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" />

      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-6 sm:p-7 text-white shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] transition-all duration-300 ease-out ${
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* soft glow */}
        <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <DollarSign className="h-8 w-8" />
          </div>

          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            Payslip
          </p>

          <div className="mt-5 w-full rounded-2xl bg-white/15 p-4 text-left backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-base font-bold leading-snug sm:text-lg">
                Use your ID No and Password to access the Payslip
              </p>
            </div>
          </div>

          <div className="mt-3 w-full rounded-2xl border border-amber-200/50 bg-amber-400/25 p-4 text-left backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-100" />
              <p className="text-sm font-semibold leading-snug text-white sm:text-base">
                If unable to access, visit Revenue Counter!
              </p>
            </div>
          </div>

          {/* progress + countdown */}
          <div className="mt-5 w-full">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs font-medium text-white/85">
              {awaitingTap
                ? "Tap the button below to open the Payslip"
                : `Please read this. The Payslip opens only when you tap the button (${secondsLeft} second${secondsLeft === 1 ? "" : "s"})`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              launch();
            }}
            className={`mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-bold shadow-lg transition-all active:scale-[0.98] ${
              awaitingTap
                ? "bg-white text-teal-700 ring-2 ring-white/70 animate-pulse"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            Open Payslip
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayslipNoticeDialog;
