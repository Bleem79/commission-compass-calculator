import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { MessageSquare, ArrowLeft, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PrivateMessage {
  id: string;
  content: string;
  created_at: string;
  driver_id: string;
}

interface DriverPrivateMessagesProps {
  onBack: () => void;
}

export const DriverPrivateMessages = ({ onBack }: DriverPrivateMessagesProps) => {
  const queryClient = useQueryClient();

  // Get the current user's driver_id from driver_credentials
  const { data: driverCredential, isLoading: isLoadingCredential } = useQuery({
    queryKey: ["driver-credential-current"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("driver_credentials")
        .select("driver_id")
        .eq("user_id", user.id)
        .eq("status", "enabled")
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch private messages for this driver
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["driver-private-messages", driverCredential?.driver_id],
    queryFn: async () => {
      if (!driverCredential?.driver_id) return [];

      const { data, error } = await supabase
        .from("admin_messages")
        .select("*")
        .eq("is_admin", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter messages that are private to this driver
      const privatePrefix = `[PRIVATE TO: ${driverCredential.driver_id}]`;
      const privateMessages = data
        .filter((msg) => msg.content.startsWith(privatePrefix))
        .map((msg) => ({
          id: msg.id,
          content: msg.content.replace(privatePrefix, "").trim(),
          created_at: msg.created_at || "",
          driver_id: driverCredential.driver_id,
        }));

      return privateMessages as PrivateMessage[];
    },
    enabled: !!driverCredential?.driver_id,
  });

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!driverCredential?.driver_id) return;

    const channel = supabase
      .channel("driver-private-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_messages",
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ["driver-private-messages", driverCredential.driver_id] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverCredential?.driver_id, queryClient]);

  const isLoading = isLoadingCredential || isLoadingMessages;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between gap-4 mb-6">
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={onBack}
            >
              <X className="h-6 w-6" />
            </Button>
          </header>

          {/* Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Private Messages</h1>
            </div>
            {driverCredential && (
              <p className="text-white/60 text-sm">
                Messages for Driver ID: {driverCredential.driver_id}
              </p>
            )}
          </div>

          {/* Messages List */}
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-white/60">
                <Inbox className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm">Private messages from admin will appear here</p>
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="p-4 space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-4 rounded-xl transition-all",
                        "bg-gradient-to-br from-teal-500/20 to-cyan-600/20",
                        "border border-teal-500/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/30">
                          <MessageSquare className="w-4 h-4 text-teal-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm sm:text-base whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          <p className="text-white/50 text-xs mt-2">
                            {message.created_at && format(new Date(message.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-6 border-t border-white/10">
            <div className="flex flex-col items-center gap-3">
              <img 
                src="/lovable-uploads/aman-logo-footer.png" 
                alt="Aman Taxi Sharjah" 
                className="h-8 sm:h-10 object-contain opacity-70"
              />
              <p className="text-xs text-white/40">© {new Date().getFullYear()} All Rights Reserved</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
