
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

interface UserProfileProps {
  email?: string;
  username?: string;
  role?: string;
}

export const UserProfile = ({ email, username, role }: UserProfileProps) => {
  const handleNotificationClick = () => {
    // Placeholder for notification functionality
    console.log('Notification clicked');
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
        <Button
          variant="ghost"
          onClick={handleNotificationClick}
          className="flex items-center gap-2 text-violet-500 hover:text-violet-600 hover:bg-violet-50 transition-colors"
        >
          <Bell className="h-6 w-6" />
          <span className="font-medium">Open Me</span>
        </Button>
      </div>
    </div>
  );
};
