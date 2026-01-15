import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const READ_MESSAGES_KEY = "driver_read_messages";

export const useUnreadMessages = () => {
  const [readMessageIds, setReadMessageIds] = useState<string[]>(() => {
    const stored = localStorage.getItem(READ_MESSAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Get the current user's driver_id from driver_credentials
  const { data: driverCredential } = useQuery({
    queryKey: ["driver-credential-unread"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("driver_credentials")
        .select("driver_id")
        .eq("user_id", user.id)
        .eq("status", "enabled")
        .maybeSingle();

      if (error) return null;
      return data;
    },
  });

  // Fetch private messages for this driver
  const { data: messages = [] } = useQuery({
    queryKey: ["driver-private-messages-count", driverCredential?.driver_id],
    queryFn: async () => {
      if (!driverCredential?.driver_id) return [];

      const { data, error } = await supabase
        .from("admin_messages")
        .select("id, content")
        .eq("is_admin", true);

      if (error) return [];

      // Filter messages that are private to this driver
      const privatePrefix = `[PRIVATE TO: ${driverCredential.driver_id}]`;
      return data.filter((msg) => msg.content.startsWith(privatePrefix));
    },
    enabled: !!driverCredential?.driver_id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!driverCredential?.driver_id) return;

    const channel = supabase
      .channel("unread-messages-count")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_messages",
        },
        () => {
          // Trigger a refetch when new messages arrive
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverCredential?.driver_id]);

  const unreadCount = messages.filter((msg) => !readMessageIds.includes(msg.id)).length;

  const markAllAsRead = () => {
    const allIds = messages.map((msg) => msg.id);
    const newReadIds = [...new Set([...readMessageIds, ...allIds])];
    setReadMessageIds(newReadIds);
    localStorage.setItem(READ_MESSAGES_KEY, JSON.stringify(newReadIds));
  };

  const markAsRead = (messageId: string) => {
    if (!readMessageIds.includes(messageId)) {
      const newReadIds = [...readMessageIds, messageId];
      setReadMessageIds(newReadIds);
      localStorage.setItem(READ_MESSAGES_KEY, JSON.stringify(newReadIds));
    }
  };

  return {
    unreadCount,
    markAllAsRead,
    markAsRead,
    totalCount: messages.length,
  };
};
