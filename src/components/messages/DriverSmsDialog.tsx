import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Search, X, MessageSquare, User, ArrowLeft, Inbox, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface DriverCredential {
  id: string;
  driver_id: string;
  user_id: string | null;
  status: string;
}

interface PrivateMessage {
  id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface DriverSmsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DriverSmsDialog = ({ isOpen, onClose }: DriverSmsDialogProps) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<DriverCredential | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all driver credentials with pagination to get all records
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ["driver-credentials-sms"],
    queryFn: async () => {
      const allDrivers: DriverCredential[] = [];
      const pageSize = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("driver_credentials")
          .select("*")
          .eq("status", "enabled")
          .order("driver_id", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allDrivers.push(...(data as DriverCredential[]));
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allDrivers;
    },
    enabled: isOpen,
  });

  // Fetch message history for selected driver
  const { data: messageHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["driver-message-history", selectedDriver?.driver_id],
    queryFn: async () => {
      if (!selectedDriver?.driver_id) return [];

      const { data, error } = await supabase
        .from("admin_messages")
        .select("*")
        .eq("is_admin", true)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Filter messages that are private to this driver
      const privatePrefix = `[PRIVATE TO: ${selectedDriver.driver_id}]`;
      const privateMessages = data
        .filter((msg) => msg.content.startsWith(privatePrefix))
        .map((msg) => ({
          id: msg.id,
          content: msg.content.replace(privatePrefix, "").trim(),
          created_at: msg.created_at || "",
          read_at: msg.read_at,
        }));

      return privateMessages as PrivateMessage[];
    },
    enabled: !!selectedDriver?.driver_id,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!selectedDriver?.driver_id) return;

    const channel = supabase
      .channel(`admin-sms-${selectedDriver.driver_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages',
        },
        (payload) => {
          const newMessage = payload.new as { content: string; is_admin: boolean };
          const privatePrefix = `[PRIVATE TO: ${selectedDriver.driver_id}]`;
          
          // Only refetch if the message is for this driver
          if (newMessage.is_admin && newMessage.content.startsWith(privatePrefix)) {
            queryClient.invalidateQueries({ queryKey: ["driver-message-history", selectedDriver.driver_id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDriver?.driver_id, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageHistory]);

  // Filter drivers based on search
  const filteredDrivers = drivers.filter((driver) =>
    driver.driver_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ driverId, content }: { driverId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Store the private message in a format that targets the specific driver
      const { error } = await supabase.from("admin_messages").insert({
        content: `[PRIVATE TO: ${driverId}] ${content}`,
        created_by: user.id,
        is_admin: true,
        is_pinned: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message sent successfully!", {
        description: `Private message sent to Driver ${selectedDriver?.driver_id}`,
      });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-messages"] });
      queryClient.invalidateQueries({ queryKey: ["driver-message-history", selectedDriver?.driver_id] });
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    },
  });

  const handleSendMessage = async () => {
    if (!selectedDriver || !message.trim()) {
      toast.error("Please select a driver and enter a message");
      return;
    }

    setIsSending(true);
    await sendMessageMutation.mutateAsync({
      driverId: selectedDriver.driver_id,
      content: message.trim(),
    });
    setIsSending(false);
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedDriver(null);
    setMessage("");
    onClose();
  };

  const content = (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Driver Selection */}
      {!selectedDriver ? (
        <div className="flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Driver ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Driver List */}
          <ScrollArea className="h-[300px] border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center h-full p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
                <User className="w-12 h-12 mb-2 opacity-50" />
                <p>No drivers found</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredDrivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedDriver(driver)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                      "hover:bg-primary/10 hover:border-primary/30",
                      "border border-transparent"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                      {driver.driver_id.slice(0, 2)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground">
                        Driver ID: {driver.driver_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {driver.status}
                      </p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      ) : (
        /* Message Composition with History */
        <div className="flex flex-col gap-3 h-full">
          {/* Selected Driver Header */}
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDriver(null)}
              className="h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {selectedDriver.driver_id.slice(0, 2)}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Driver ID: {selectedDriver.driver_id}
              </p>
              <p className="text-xs text-muted-foreground">Private Message</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDriver(null)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Message History */}
          <div className="flex-1 border rounded-lg bg-muted/30 overflow-hidden">
            <ScrollArea className="h-[200px]">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : messageHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-muted-foreground">
                  <Inbox className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">No message history</p>
                  <p className="text-xs">Start the conversation below</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {messageHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex justify-end"
                    >
                      <div className="max-w-[85%] p-3 rounded-lg bg-primary text-primary-foreground">
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <p className="text-[10px] opacity-70">
                            {msg.created_at && format(new Date(msg.created_at), "MMM d, h:mm a")}
                          </p>
                          <span title={msg.read_at ? `Read ${format(new Date(msg.read_at), "MMM d, h:mm a")}` : "Sent"}>
                            {msg.read_at ? (
                              <CheckCheck className="w-3 h-3 text-blue-300" />
                            ) : (
                              <Check className="w-3 h-3 opacity-70" />
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Message Input */}
          <Textarea
            placeholder="Type your private message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[80px] resize-none"
          />

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending}
            className="w-full gap-2"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Private Message
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Send SMS to Driver
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Send SMS to Driver
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
