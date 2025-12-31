import React, { useState, useEffect } from 'react';
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
import { Trash2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
      
      const { error } = await supabase
        .from('admin_messages')
        .insert([{ 
          content, 
          created_by: user.id,
          is_admin: true 
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      refetch();
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
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

  const MessagesContent = () => (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <ScrollArea className="h-[40vh] sm:h-[300px] w-full rounded-md border bg-background p-3 sm:p-4">
        {messages?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No messages yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages?.map((message) => (
              <div
                key={message.id}
                className="rounded-lg bg-secondary p-3 relative group border border-border/50"
              >
                <p className="text-sm pr-8 whitespace-pre-wrap break-words leading-relaxed text-white">
                  {linkifyText(message.content)}
                </p>
                <p className="text-xs text-gray-300 mt-2">
                  {new Date(message.created_at).toLocaleString()}
                </p>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={() => handleDelete(message.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/90" />
                  </Button>
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
          <Button 
            onClick={handleSend}
            disabled={!newMessage.trim() || sendMessageMutation.isPending || !user?.id}
            className="w-full h-11 text-base"
          >
            {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
          </Button>
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
          <MessagesContent />
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
        <MessagesContent />
      </DialogContent>
    </Dialog>
  );
};