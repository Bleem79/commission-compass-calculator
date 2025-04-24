
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
          size="icon"
          onClick={handleNotificationClick}
          className="text-indigo-600 hover:bg-indigo-50"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
