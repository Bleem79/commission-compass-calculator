
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ListCheck, 
  Calculator, 
  Bell, 
  Info, 
  Percent, 
  Wifi 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/components/calculator/UserProfile";
import { AdminMessages } from "@/components/messages/AdminMessages";

const menuItems = [
  {
    title: "View Commission Table",
    icon: ListCheck,
    path: "/commission-table",
    color: "bg-gradient-to-br from-blue-400 to-blue-600"
  },
  {
    title: "Commission Percentage Calculator",
    icon: Calculator,
    path: "/dashboard",
    color: "bg-gradient-to-br from-indigo-400 to-indigo-600"
  },
  {
    title: "Open Me",
    icon: Bell,
    action: "messages",
    color: "bg-gradient-to-br from-violet-400 to-violet-600"
  },
  {
    title: "Info",
    icon: Info,
    path: "/info",
    color: "bg-gradient-to-br from-pink-400 to-pink-600"
  },
  {
    title: "M-fuel %",
    icon: Percent,
    path: "/m-fuel",
    color: "bg-gradient-to-br from-green-400 to-green-600"
  },
  {
    title: "Hotspot",
    icon: Wifi,
    path: "/hotspot",
    color: "bg-gradient-to-br from-orange-400 to-orange-600"
  }
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);

  const handleMenuItemClick = (item: typeof menuItems[0]) => {
    if (item.action === "messages") {
      setIsMessagesOpen(true);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-purple-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-6">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-indigo-800">
              Driver Portal
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {user?.role && (
              <span className="text-slate-600">
                Role: {user.role}
              </span>
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* User Profile */}
        {user && (
          <UserProfile 
            email={user.email} 
            username={user.username} 
            role={user.role}
          />
        )}

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
          {menuItems.map((item, index) => (
            <Card 
              key={index} 
              className={`${item.color} text-white shadow-lg hover:shadow-xl transition-all cursor-pointer h-40`}
              onClick={() => handleMenuItemClick(item)}
            >
              <CardContent className="flex flex-col items-center justify-center h-full p-6">
                <item.icon size={48} className="mb-3" />
                <h2 className="text-lg font-medium text-center">{item.title}</h2>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Messages Dialog */}
      <AdminMessages
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
      />
    </div>
  );
};

export default HomePage;
