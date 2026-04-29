import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Award, Calendar, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface BadgeLeaderboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  driverId?: string;
}

interface CatalogItem {
  id: string;
  title: string;
  description: string;
  image_path: string | null;
  sort_order: number;
}

interface HistoryRow {
  id: string;
  month: string;
  badge_type: string;
  created_at: string;
}

// Convert various month inputs into "MMMM yyyy", e.g. "January 2026"
const formatMonth = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";
  if (/^\d{4,6}$/.test(value)) {
    const ms = Math.round((Number(value) - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return format(d, "MMMM yyyy");
  }
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime()) && /[-/]/.test(value)) {
    return format(parsed, "MMMM yyyy");
  }
  return value.replace(/-/g, " ");
};

// Color theme per rank tier (matches the user's reference)
const tierColor = (idx: number): { ring: string; chipBg: string; chipText: string; descText: string } => {
  const palette = [
    { ring: "ring-amber-400/70",  chipBg: "bg-amber-500/15",   chipText: "text-amber-300",  descText: "text-amber-200" },   // 1
    { ring: "ring-slate-300/70",  chipBg: "bg-slate-400/15",   chipText: "text-slate-200",  descText: "text-slate-200" },   // 2
    { ring: "ring-yellow-400/70", chipBg: "bg-yellow-500/15",  chipText: "text-yellow-300", descText: "text-yellow-300" },  // 3 (Gold)
    { ring: "ring-zinc-300/70",   chipBg: "bg-zinc-400/15",    chipText: "text-zinc-200",   descText: "text-zinc-100" },    // 4 Platinum
    { ring: "ring-cyan-300/70",   chipBg: "bg-cyan-400/15",    chipText: "text-cyan-200",   descText: "text-cyan-100" },    // 5 Diamond
    { ring: "ring-violet-400/70", chipBg: "bg-violet-500/15",  chipText: "text-violet-200", descText: "text-violet-200" },  // 6 Elite Diamond
    { ring: "ring-rose-500/70",   chipBg: "bg-rose-600/15",    chipText: "text-rose-300",   descText: "text-rose-300" },    // 7 Ruby
    { ring: "ring-emerald-400/70",chipBg: "bg-emerald-500/15", chipText: "text-emerald-200",descText: "text-emerald-300" }, // 8 Emerald
    { ring: "ring-blue-400/70",   chipBg: "bg-blue-500/15",    chipText: "text-blue-200",   descText: "text-blue-300" },    // 9 Sapphire
    { ring: "ring-zinc-500/70",   chipBg: "bg-zinc-700/30",    chipText: "text-zinc-300",   descText: "text-zinc-300" },    // 10 Black Diamond
    { ring: "ring-red-500/70",    chipBg: "bg-red-600/15",     chipText: "text-red-300",    descText: "text-red-400" },     // 11 Red Diamond
    { ring: "ring-fuchsia-400/70",chipBg: "bg-fuchsia-500/15", chipText: "text-fuchsia-200",descText: "text-fuchsia-300" }, // 12 Crown Jewel
  ];
  return palette[idx] ?? palette[palette.length - 1];
};

export const BadgeLeaderboardDialog = ({ isOpen, onClose, driverId }: BadgeLeaderboardDialogProps) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("driver_badge_catalog")
        .select("id, title, description, image_path, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (!error) setItems((data as CatalogItem[]) || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("driver-badges").getPublicUrl(path);
    return data.publicUrl;
  };

  const catalogImageByType = (badgeType: string): string | null => {
    const key = badgeType.trim().toLowerCase();
    const match = items.find(
      (i) =>
        i.title.trim().toLowerCase() === key ||
        (i.description && i.description.trim().toLowerCase() === key),
    );
    return match ? getImageUrl(match.image_path) : null;
  };

  const openHistory = async () => {
    if (!driverId) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("driver_badges")
      .select("id, month, badge_type, created_at")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });
    if (!error) setHistory((data as HistoryRow[]) || []);
    setHistoryLoading(false);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="
          max-w-[95vw] sm:max-w-[520px] p-0 overflow-hidden
          bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950
          border-amber-700/40
          text-white
        "
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-3 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-amber-700/30">
          <DialogTitle asChild>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center gap-3">
                <Trophy className="h-7 w-7 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                <h2 className="text-3xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-500">
                  LEADERBOARD
                </h2>
                <Trophy className="h-7 w-7 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
              </div>
              <p className="text-[10px] tracking-[0.4em] text-amber-200/70 font-semibold uppercase">
                Drive · Achieve · Be Legendary
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="max-h-[65vh] overflow-y-auto divide-y divide-white/5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400 text-sm">
              No badge tiers configured yet.
            </div>
          ) : (
            items.map((item, idx) => {
              const c = tierColor(idx);
              const imgUrl = getImageUrl(item.image_path);
              const rank = idx + 1;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-3 hover:bg-white/5 transition"
                >
                  {/* Rank medallion */}
                  <div
                    className={`
                      shrink-0 h-9 w-9 rounded-full flex items-center justify-center
                      bg-gradient-to-b from-slate-700 to-slate-900
                      ring-2 ${c.ring} shadow-[0_0_10px_rgba(0,0,0,0.5)]
                      text-sm font-black text-white
                    `}
                  >
                    {rank}
                  </div>

                  {/* Middle: text content */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`
                          text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                          ${c.chipBg} ${c.chipText} border border-white/10
                          inline-flex items-center gap-1 whitespace-nowrap
                        `}
                      >
                        <Calendar className="h-2.5 w-2.5" />
                        {rank}-MONTH
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${c.descText} truncate`}>
                        {item.description}
                      </span>
                    </div>
                    <div className="font-extrabold uppercase text-sm tracking-wide text-white truncate">
                      {item.title}
                    </div>
                  </div>

                  {/* Badge image */}
                  <div className="shrink-0">
                    {imgUrl ? (
                      <div
                        className={`h-12 w-12 rounded-md overflow-hidden ring-2 ${c.ring} bg-white/5 flex items-center justify-center`}
                      >
                        <img
                          src={imgUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-md border border-dashed border-white/20 flex items-center justify-center text-white/30">
                        <Award className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-amber-700/30 bg-slate-950 flex flex-col items-center gap-2">
          {driverId && (
            <Button
              onClick={openHistory}
              size="sm"
              className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-slate-950 font-bold tracking-wide"
            >
              <History className="h-4 w-4 mr-1.5" />
              My Badge History
            </Button>
          )}
          <p className="text-[10px] tracking-[0.35em] text-amber-200/70 font-semibold uppercase">
            Every Mile Counts · Every Badge Matters
          </p>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={historyOpen} onOpenChange={(o) => !o && setHistoryOpen(false)}>
      <DialogContent className="max-w-[95vw] sm:max-w-[480px] p-0 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-amber-700/40 text-white">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-amber-700/30">
          <DialogTitle asChild>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center gap-2">
                <History className="h-6 w-6 text-amber-400" />
                <h2 className="text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-500">
                  BADGE HISTORY
                </h2>
              </div>
              {driverId && (
                <p className="text-[10px] tracking-[0.3em] text-amber-200/70 font-semibold uppercase">
                  Driver ID: {driverId}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto divide-y divide-white/5">
          {historyLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400 text-sm">
              No badge achievements yet. Keep driving safely!
            </div>
          ) : (
            history.map((row) => {
              const imgUrl = catalogImageByType(row.badge_type);
              return (
                <div key={row.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                  <div className="shrink-0 h-12 w-12 rounded-md overflow-hidden ring-2 ring-amber-400/60 bg-white/5 flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={row.badge_type} className="w-full h-full object-cover" />
                    ) : (
                      <Award className="h-6 w-6 text-amber-300/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                      <Calendar className="h-3 w-3" />
                      {formatMonth(row.month)}
                    </div>
                    <div className="font-extrabold uppercase text-sm tracking-wide text-white truncate">
                      {row.badge_type}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-3 border-t border-amber-700/30 bg-slate-950 text-center">
          <p className="text-[10px] tracking-[0.35em] text-amber-200/70 font-semibold uppercase">
            {history.length} {history.length === 1 ? "Badge" : "Badges"} Earned
          </p>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
