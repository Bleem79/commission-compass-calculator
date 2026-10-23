import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SmsHistoryEntry {
  id: string;
  sent_by_name: string | null;
  message: string;
  template_title: string | null;
  nationalities: string[];
  recipient_ids: string[];
  failed_ids: string[];
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export async function logSmsSend(entry: {
  message: string;
  templateTitle?: string | null;
  nationalities?: string[];
  sentIds: string[];
  failedIds: string[];
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const name = (user.user_metadata as any)?.username || user.email || null;
    await (supabase.from("sms_send_history" as any) as any).insert({
      sent_by: user.id,
      sent_by_name: name,
      message: entry.message,
      template_title: entry.templateTitle || null,
      nationalities: entry.nationalities || [],
      recipient_ids: entry.sentIds,
      failed_ids: entry.failedIds,
      sent_count: entry.sentIds.length,
      failed_count: entry.failedIds.length,
    });
  } catch (e) {
    console.error("Failed to log SMS history", e);
  }
}

const PAGE = 15;

export const SmsSendHistory = ({ onBack }: { onBack: () => void }) => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["sms-send-history"],
    queryFn: async () => {
      const all: SmsHistoryEntry[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await (supabase.from("sms_send_history" as any) as any)
          .select("*").order("created_at", { ascending: false }).range(from, from + 999);
        if (error) throw error;
        all.push(...(data || []));
        if ((data?.length || 0) < 1000) return all;
      }
    },
  });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? data.filter(e => e.message.toLowerCase().includes(q) || (e.template_title || "").toLowerCase().includes(q)
        || e.recipient_ids.some(id => id.toLowerCase().includes(q)))
    : data;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const rows = filtered.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="min-h-11"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
        <h3 className="font-semibold flex items-center gap-2"><History className="w-4 h-4" />SMS Send History</h3>
      </div>
      <Input placeholder="Search message, template or Driver ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
      {isLoading && <p className="text-sm text-muted-foreground">Loading history...</p>}
      {error && <p role="alert" className="text-sm text-destructive">Unable to load history.</p>}
      {!isLoading && !error && filtered.length === 0 && <p className="text-sm text-muted-foreground">No messages sent yet.</p>}
      {rows.map(e => (
        <div key={e.id} className="rounded-lg border bg-card p-3 text-sm space-y-1">
          <div className="flex justify-between gap-2 text-xs text-muted-foreground">
            <span>{format(new Date(e.created_at), "dd MMM yyyy, hh:mm a")}</span>
            <span>by {e.sent_by_name || "Unknown"}</span>
          </div>
          {e.template_title && <p className="font-medium">{e.template_title}</p>}
          <p dir="auto" className="whitespace-pre-wrap text-start" style={{ unicodeBidi: "plaintext" }}>{e.message}</p>
          {e.nationalities.length > 0 && <p className="text-xs text-muted-foreground">Nationalities: {e.nationalities.join(", ")}</p>}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-green-700 font-medium">Sent: {e.sent_count}</span>
            {e.failed_count > 0 && <span className="text-destructive font-medium">Failed: {e.failed_count}</span>}
            <button type="button" className="underline text-primary min-h-11" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
              {expanded === e.id ? "Hide recipients" : "Show recipients"}
            </button>
          </div>
          {expanded === e.id && (
            <div className="text-xs break-words max-h-32 overflow-y-auto">
              {e.recipient_ids.join(", ")}
              {e.failed_ids.length > 0 && <p className="text-destructive mt-1">Failed: {e.failed_ids.join(", ")}</p>}
            </div>
          )}
        </div>
      ))}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="min-h-11">Previous</Button>
          <span className="text-xs">Page {page + 1} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} className="min-h-11">Next</Button>
        </div>
      )}
    </div>
  );
};
