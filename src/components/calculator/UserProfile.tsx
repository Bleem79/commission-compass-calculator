
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Home } from "lucide-react";
import { AdminMessages } from "@/components/messages/AdminMessages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UserProfileProps {
  email?: string;
  username?: string;
  role?: string;
}

export const UserProfile = ({ email, username, role }: UserProfileProps) => {
  const navigate = useNavigate();
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

  const handleGoHome = () => {
    navigate('/home');
  };

  return (
    <div className="mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 rounded-full p-3 h-10 w-10 flex items-center justify-center">
            <span className="text-indigo-600 font-medium">
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
            onClick={() => setIsMessagesOpen(true)}
            className="relative flex items-center gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          >
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
            {hasUnreadMessages && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                !
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleGoHome}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          >
            <Home className="h-5 w-5" />
            <span>Back to Home</span>
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
