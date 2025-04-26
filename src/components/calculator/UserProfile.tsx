
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellDot } from "lucide-react";
import { AdminMessages } from "@/components/messages/AdminMessages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserProfileProps {
  email?: string;
  username?: string;
  role?: string;
}

export const UserProfile = ({ email, username, role }: UserProfileProps) => {
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);

  const { data: hasUnreadMessages } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('id')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data.length > 0;
    },
    refetchInterval: 30000, // Check for new messages every 30 seconds
  });

  const handleNotificationClick = () => {
    setIsMessagesOpen(true);
  };

  return (
    <div className="mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 rounded-full p-2">
            <span className="text-indigo-600">
              {username?.charAt(0).toUpperCase() || email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <p className="text-indigo-900 font-medium">{email || username}</p>
            <p className="text-sm text-indigo-600 capitalize">Role: {role}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleNotificationClick}
            className={`flex items-center gap-2 transition-colors ${
              hasUnreadMessages 
                ? 'text-violet-600 hover:text-violet-700 hover:bg-violet-50' 
                : 'text-violet-500 hover:text-violet-600 hover:bg-violet-50'
            }`}
          >
            {hasUnreadMessages ? (
              <BellDot className="h-6 w-6" />
            ) : (
              <Bell className="h-6 w-6" />
            )}
            <span className="font-medium">Open Me</span>
          </Button>
        </div>
      </div>

      <AdminMessages 
        isOpen={isMessagesOpen} 
        onClose={() => setIsMessagesOpen(false)} 
      />
    </div>
  );
}
