
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const { user } = useAuth();
  const [adminPassword, setAdminPassword] = useState("");

  if (user?.role !== "admin") {
    return null;
  }

  const handleSaveSettings = () => {
    toast({
      title: "Data Exported",
      description: "Commission data exported successfully.",
      className: "bg-green-50 text-green-700"
    });
  };

  const handleChangePassword = () => {
    if (adminPassword.trim().length >= 6) {
      toast({
        title: "Password updated",
        description: "Admin password has been updated successfully.",
        className: "bg-green-50 text-green-700"
      });
      setAdminPassword("");
    } else {
      toast({
        title: "Password error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 via-purple-100 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-black/90">
            <Settings className="mr-2 h-5 w-5 text-primary animate-spin-slow" />
            Admin Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Change Admin Password */}
            <div>
              <Label htmlFor="adminPassword" className="font-bold text-indigo-700">Change Admin Password</Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="New password"
                  className="bg-white border-2 border-indigo-100 shadow-sm focus:ring-2 focus:ring-indigo-200"
                />
                <Button onClick={handleChangePassword} className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold shadow">
                  Update
                </Button>
              </div>
            </div>
            {/* Commission Data Management */}
            <div>
              <Label className="font-bold text-purple-700">Commission Data Management</Label>
              <div className="flex space-x-2 mt-2">
                <Button 
                  className="flex-1 bg-black text-white font-semibold hover:bg-indigo-800 shadow"
                  onClick={handleSaveSettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
                <Button 
                  className="flex-1 bg-black text-white font-semibold hover:bg-purple-800 shadow"
                  onClick={() => toast({
                    title: "Manage Users",
                    description: "User management feature coming soon!",
                    className: "bg-blue-50 text-blue-700"
                  })}>
                  <Users className="mr-2 h-4 w-4" />
                  Manage Users
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;

