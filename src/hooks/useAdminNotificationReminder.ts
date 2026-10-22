import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { collectMessagePages } from "@/utils/privateMessageDelivery";
import { unreadAdminNotificationIds } from "@/utils/adminNotificationReminder";

export const useAdminNotificationReminder = (userId: string | undefined, enabled: boolean, isOpen: boolean) => {
  const queryClient = useQueryClient();
  const storageKey = userId ? `admin-notifications-read:${userId}` : null;
  const [readState, setReadState] = useState<{ key: string | null; ids: string[] }>({ key: null, ids: [] });

  useEffect(() => {
    let ids: string[] = [];
    try {
      const stored: unknown = JSON.parse(storageKey ? localStorage.getItem(storageKey) || "[]" : "[]");
      if (Array.isArray(stored)) ids = stored.filter((id): id is string => typeof id === "string");
    } catch { /* Storage may be unavailable. Reminders still work in this session. */ }
    setReadState({ key: storageKey, ids });
  }, [storageKey]);

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-notification-reminders", userId],
    enabled: enabled && !!userId,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!userId) return [];
      return collectMessagePages(async (from, to) => {
        const { data, error } = await supabase.from("admin_messages")
          .select("id").eq("is_admin", true).neq("created_by", userId)
          .not("content", "ilike", "[PRIVATE TO:%")
          .order("id", { ascending: true }).range(from, to);
        if (error) throw error;
        return data || [];
      });
    },
  });

  const unreadIds = useMemo(() => unreadAdminNotificationIds(messages, readState.ids), [messages, readState.ids]);

  useEffect(() => {
    if (!isOpen || !storageKey || readState.key !== storageKey || unreadIds.length === 0) return;
    const ids = [...new Set([...readState.ids, ...unreadIds])];
    setReadState({ key: storageKey, ids });
    try { localStorage.setItem(storageKey, JSON.stringify(ids)); } catch { /* Session-only fallback. */ }
  }, [isOpen, storageKey, readState, unreadIds]);

  useEffect(() => {
    if (!enabled || !userId) return;
    const channel = supabase.channel(`admin-notification-reminders:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-notification-reminders", userId] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, userId, queryClient]);

  return { unreadCount: enabled && !isOpen && readState.key === storageKey ? unreadIds.length : 0 };
};