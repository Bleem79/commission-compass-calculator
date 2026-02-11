import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus, Users, Shield, Eye, Loader2, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

interface PortalUser {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
  banned: boolean;
}

const RevenueControllerPortalPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home", { replace: true });
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await supabase.functions.invoke("create-portal-user", {
        body: { action: "list" },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setUsers(response.data.users || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !email.trim() || !password.trim() || !role) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const response = await supabase.functions.invoke("create-portal-user", {
        body: { action: "create", email: email.trim(), password, username: username.trim(), role },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: "Success", description: `User "${username}" created with ${role} role` });
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create user", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      const response = await supabase.functions.invoke("create-portal-user", {
        body: { action: "change_role", user_id: userId, new_role: newRole },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      toast({ title: "Success", description: `Role updated to ${newRole}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update role", variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleStatus = async (userId: string, currentlyBanned: boolean) => {
    setUpdatingUserId(userId);
    try {
      const response = await supabase.functions.invoke("create-portal-user", {
        body: { action: "toggle_status", user_id: userId, disable: !currentlyBanned },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, banned: !currentlyBanned } : u))
      );
      toast({
        title: "Success",
        description: currentlyBanned ? "User enabled" : "User disabled",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to toggle status", variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "advanced") {
      return <Badge className="bg-amber-500/20 text-amber-700 border-amber-300"><Shield className="w-3 h-3 mr-1" /> Advanced</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-700 border-blue-300"><Eye className="w-3 h-3 mr-1" /> User</Badge>;
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Revenue Controller Portal</h1>
            <p className="text-sm text-white/60">Manage system users and their access levels</p>
          </div>
        </div>

        {/* Role Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 flex items-start gap-3">
              <Shield className="w-8 h-8 text-amber-600 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-800">Advanced Role</h3>
                <p className="text-sm text-amber-700">Full access to all pages. Cannot delete records or upload files.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 flex items-start gap-3">
              <Eye className="w-8 h-8 text-blue-600 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-800">User Role</h3>
                <p className="text-sm text-blue-700">View-only access to all admin pages. Cannot modify any data.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create User Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create New User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advanced">Advanced - Full access (no delete/upload)</SelectItem>
                      <SelectItem value="user">User - View only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={isCreating} className="w-full sm:w-auto">
                {isCreating ? "Creating..." : "Create User"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Portal Users ({users.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loadingUsers}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loadingUsers ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground text-sm">Loading users...</span>
              </div>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No portal users created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className={u.banned ? "opacity-50" : ""}>
                        <TableCell className="font-medium">
                          {u.username || <span className="text-muted-foreground italic">No username</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {u.email || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={u.role}
                            onValueChange={(newRole) => handleRoleChange(u.id, newRole)}
                            disabled={updatingUserId === u.id}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="advanced">
                                <div className="flex items-center gap-1">
                                  <Shield className="w-3 h-3" /> Advanced
                                </div>
                              </SelectItem>
                              <SelectItem value="user">
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" /> User
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge className={u.banned
                            ? "bg-red-500/20 text-red-700 border-red-300"
                            : "bg-green-500/20 text-green-700 border-green-300"
                          }>
                            {u.banned ? "Disabled" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Switch
                              checked={!u.banned}
                              onCheckedChange={() => handleToggleStatus(u.id, u.banned)}
                              disabled={updatingUserId === u.id}
                            />
                            {updatingUserId === u.id && (
                              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueControllerPortalPage;
