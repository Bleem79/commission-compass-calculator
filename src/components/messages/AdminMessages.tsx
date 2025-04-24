
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2 } from "lucide-react";

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

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('admin_messages')
        .insert([{ 
          content, 
          created_by: user?.id,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isAdmin ? "Send Messages to Users" : "Admin Messages"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            {messages?.length === 0 ? (
              <p className="text-center text-muted-foreground">No messages yet</p>
            ) : (
              <div className="flex flex-col gap-3">
                {messages?.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-lg bg-secondary/50 p-3 relative group"
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Type your message here..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <Button 
                onClick={handleSend}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
              >
                Send Message
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
