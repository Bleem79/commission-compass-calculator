import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Award, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BadgeLeaderboardDialog } from "./BadgeLeaderboardDialog";

// Convert various month inputs (Excel serial number, ISO date, plain text)
// into a human-readable "Month-YYYY" string, e.g. "April-2026".
const formatBadgeMonth = (raw: string | null | undefined): string | null => {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;

  // Excel serial date (e.g. "46113" => 2026-04-01)
  if (/^\d{4,6}$/.test(value)) {
    const serial = Number(value);
    // Excel epoch starts at 1899-12-30 (accounting for the 1900 leap-year bug)
    const ms = Math.round((serial - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return format(d, "MMMM-yyyy");
    }
  }

  // ISO / parseable date string
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime()) && /[-/]/.test(value)) {
    return format(parsed, "MMMM-yyyy");
  }

  // Already a readable label — return as-is
  return value;
};

interface DriverQRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  driverName: string | null;
}

export const DriverQRCodeDialog = ({ isOpen, onClose, driverId, driverName }: DriverQRCodeDialogProps) => {
  const [now, setNow] = useState(new Date());
  const [badgeImage, setBadgeImage] = useState<string | null>(null);
  const [badgeMonth, setBadgeMonth] = useState<string | null>(null);
  const [badgeType, setBadgeType] = useState<string | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !driverId) return;
    let cancelled = false;

    const loadBadge = async () => {
      // Latest badge record for this driver
      const { data: badges } = await supabase
        .from("driver_badges")
        .select("month, badge_type")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      const latest = badges && badges[0];
      if (!latest) {
        setBadgeImage(null);
        setBadgeMonth(null);
        setBadgeType(null);
        return;
      }
      setBadgeMonth(latest.month);
      setBadgeType(latest.badge_type);

      // Match catalog by title or description (case-insensitive)
      const { data: catalog } = await supabase
        .from("driver_badge_catalog")
        .select("title, description, image_path");

      if (cancelled) return;

      const key = (latest.badge_type || "").trim().toLowerCase();
      const match = (catalog || []).find(
        (c) =>
          (c.title || "").trim().toLowerCase() === key ||
          (c.description || "").trim().toLowerCase() === key,
      );
      if (match?.image_path) {
        const { data } = supabase.storage
          .from("driver-badges")
          .getPublicUrl(match.image_path);
        setBadgeImage(data.publicUrl);
      } else {
        setBadgeImage(null);
      }
    };

    loadBadge();
    return () => {
      cancelled = true;
    };
  }, [isOpen, driverId]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[340px] sm:max-w-[380px] bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-white text-lg font-bold tracking-wide">
            {driverName || "Driver"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Badge image (no white background) */}
          <div className="flex items-center justify-center w-[392px] h-[392px] max-w-full -mx-6">
            {badgeImage ? (
              <img
                src={badgeImage}
                alt={badgeType ? `${badgeType} badge` : "Driver badge"}
                className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(249,115,22,0.35)]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-white/60">
                <Award className="h-12 w-12" />
                <span className="text-xs font-medium text-center px-2">
                  No badge assigned yet
                </span>
              </div>
            )}
          </div>

          {/* Driver Name */}
          {driverName && (
            <div className="text-center space-y-1">
              <p className="text-xs uppercase tracking-widest text-white/50">Full Name</p>
              <p
                className="font-semibold text-white/90 break-words max-w-full px-2"
                style={{
                  fontSize:
                    driverName.length > 25
                      ? "0.875rem"
                      : driverName.length > 18
                      ? "1rem"
                      : "1.125rem",
                }}
              >
                {driverName}
              </p>
            </div>
          )}

          {/* Driver ID */}
          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-widest text-white/50">Driver ID</p>
            <p className="text-2xl font-bold tracking-wider text-white">{driverId}</p>
            {badgeMonth && (
              <p className="text-sm font-semibold text-amber-300 tracking-wide pt-1">
                {formatBadgeMonth(badgeMonth)}
              </p>
            )}
            <button
              type="button"
              onClick={() => setLeaderboardOpen(true)}
              className="
                mt-2 inline-flex items-center gap-1.5 px-3 py-1
                rounded-full text-[11px] font-bold uppercase tracking-wider
                bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600
                text-slate-900 hover:from-amber-400 hover:to-amber-500
                shadow-[0_0_15px_rgba(251,191,36,0.35)]
                transition
              "
            >
              <Trophy className="h-3.5 w-3.5" />
              Leaderboard
            </button>
          </div>

          {/* Current Date & Time */}
          <div className="text-center space-y-0.5">
            <p className="text-xs uppercase tracking-widest text-white/50">Date & Time</p>
            <p className="text-sm font-medium text-white/80">{format(now, "dd MMM yyyy  •  hh:mm:ss a")}</p>
          </div>

          {/* Decorative divider */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/20" />
            <img
              src="/lovable-uploads/aman-logo-footer.png"
              alt="Aman"
              className="h-5 opacity-40"
            />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/20" />
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <BadgeLeaderboardDialog
      isOpen={leaderboardOpen}
      onClose={() => setLeaderboardOpen(false)}
    />
    </>
  );
};
