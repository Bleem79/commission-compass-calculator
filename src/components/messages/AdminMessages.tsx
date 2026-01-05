import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Pin, PinOff, BellRing } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// Helper function to convert URLs in text to clickable links
const linkifyText = (text: string): React.ReactNode[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      // Reset regex lastIndex since we're reusing it
      urlRegex.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

interface Message {
  id: string;
  content: string;
  created_at: string;
  is_admin: boolean;
  is_pinned: boolean | null;
}

export const AdminMessages = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const [newMessage, setNewMessage] = useState("");
  const { user, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const { sendNotification, isGranted } = usePushNotifications();
  const lastMessageIdRef = useRef<string | null>(null);
  
  const { data: messages, refetch } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Message[];
    }
  });

  // Real-time subscription for new messages with notification
  useEffect(() => {
    const channel = supabase
      .channel('admin-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_messages'
        },
        (payload) => {
          const newMsg = payload.new as Message;
          
          // Send push notification for new messages (not from current user)
          if (newMsg.is_admin && newMsg.id !== lastMessageIdRef.current && isGranted && !isAdmin) {
            sendNotification({
              title: "📢 New Admin Message",
              body: newMsg.content.substring(0, 100) + (newMsg.content.length > 100 ? "..." : ""),
              tag: "admin-message-" + newMsg.id,
            });
          }
          
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_messages'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, sendNotification, isGranted, isAdmin]);

  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (isOpen && !isAdmin) {
        const { error } = await supabase
          .from('admin_messages')
          .update({ read_at: new Date().toISOString() })
          .is('read_at', null);
        
        if (error) {
          console.error('Error marking messages as read:', error);
        }
      }
    };

    markMessagesAsRead();
  }, [isOpen, isAdmin]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('admin_messages')
        .insert([{ 
          content, 
          created_by: user.id,
          is_admin: true 
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Store the message ID to avoid self-notification
      if (data) {
        lastMessageIdRef.current = data.id;
      }
      
      return data;
    },
    onSuccess: () => {
      setNewMessage("");
      refetch();
      toast({
        title: "Message sent",
        description: "Your message has been sent to all users.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleTestNotification = async () => {
    const success = await sendNotification({
      title: "📢 Test Notification",
      body: "This is a test notification from MyAman WebApp. Notifications are working!",
      tag: "test-notification",
    });
    
    if (success) {
      toast({
        title: "Test notification sent",
        description: "Check your notification area!",
      });
    } else {
      toast({
        title: "Notification failed",
        description: "Make sure notifications are enabled in your browser settings.",
        variant: "destructive",
      });
    }
  };

  const togglePinMutation = useMutation({
    mutationFn: async ({ messageId, isPinned }: { messageId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('admin_messages')
        .update({ is_pinned: !isPinned })
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Message updated",
        description: "Pin status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pin status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('admin_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Message deleted",
        description: "The message has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  const handleDelete = (messageId: string) => {
    deleteMessageMutation.mutate(messageId);
  };

  const handleTogglePin = (messageId: string, isPinned: boolean) => {
    togglePinMutation.mutate({ messageId, isPinned });
  };

  // Sort messages: pinned first, then by date
  const sortedMessages = messages?.slice().sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const messagesContent = (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <ScrollArea className="h-[40vh] sm:h-[300px] w-full rounded-md border bg-background p-3 sm:p-4">
        {sortedMessages?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No messages yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedMessages?.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg bg-secondary p-3 relative group border ${message.is_pinned ? 'border-primary/50 bg-primary/10' : 'border-border/50'}`}
              >
                {message.is_pinned && (
                  <div className="absolute -top-2 left-3 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Pin className="h-3 w-3" />
                    Pinned
                  </div>
                )}
                <p className={`text-sm pr-16 whitespace-pre-wrap break-words leading-relaxed text-white ${message.is_pinned ? 'mt-2' : ''}`}>
                  {linkifyText(message.content)}
                </p>
                <p className="text-xs text-gray-300 mt-2">
                  {new Date(message.created_at).toLocaleString()}
                </p>
                {isAdmin && (
                  <div className="absolute right-1 top-1 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => handleTogglePin(message.id, !!message.is_pinned)}
                      title={message.is_pinned ? "Unpin message" : "Pin message"}
                    >
                      {message.is_pinned ? (
                        <PinOff className="h-4 w-4 text-primary" />
                      ) : (
                        <Pin className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={() => handleDelete(message.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/90" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {isAdmin && (
        <div className="flex flex-col gap-3">
          <Textarea
            placeholder="Type your message here..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="min-h-[80px] text-base"
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMessageMutation.isPending || !user?.id}
              className="flex-1 h-11 text-base"
            >
              {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestNotification}
              className="h-11 px-4"
              title="Send test notification"
            >
              <BellRing className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-lg font-bold text-center">
              {isAdmin ? "Send Messages to Users" : "Admin Messages"}
            </DrawerTitle>
          </DrawerHeader>
          {messagesContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isAdmin ? "Send Messages to Users" : "Admin Messages"}
          </DialogTitle>
        </DialogHeader>
        {messagesContent}
      </DialogContent>
    </Dialog>
  );
};