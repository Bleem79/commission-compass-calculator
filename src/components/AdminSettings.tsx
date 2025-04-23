
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
      title: "Settings saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleChangePassword = () => {
    if (adminPassword.trim().length >= 6) {
      toast({
        title: "Password updated",
        description: "Admin password has been updated successfully.",
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Admin Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminPassword">Change Admin Password</Label>
              <div className="flex space-x-2 mt-1">
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="New password"
                />
                <Button onClick={handleChangePassword}>Update</Button>
              </div>
            </div>
            
            <div className="mt-4">
              <Label>Commission Data Management</Label>
              <div className="flex space-x-2 mt-1">
                <Button className="flex-1" onClick={handleSaveSettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
                <Button className="flex-1" onClick={handleSaveSettings}>
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
