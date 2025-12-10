
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
    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-indigo-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-100 rounded-full p-2 sm:p-3 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 font-medium text-sm sm:text-base">
              {username?.charAt(0).toUpperCase() || email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-indigo-900 font-medium text-sm sm:text-base truncate">{email || username}</p>
            <p className="text-xs sm:text-sm text-indigo-600 capitalize">Role: {role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMessagesOpen(true)}
            className="relative flex items-center gap-1 sm:gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-9 px-2 sm:px-3"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm">Notifications</span>
            {hasUnreadMessages && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full">
                !
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoHome}
            className="flex items-center gap-1 sm:gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-9 px-2 sm:px-3"
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm">Home</span>
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
