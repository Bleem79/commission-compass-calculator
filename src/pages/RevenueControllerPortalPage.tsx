import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus, Users, Shield, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PortalUser {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
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

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home", { replace: true });
      return;
    }
    fetchUsers();
  }, [isAdmin, navigate]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["user", "advanced"]);

      if (error) throw error;

      // We can't query auth.users directly, so we'll display what we have
      const portalUsers: PortalUser[] = (data || []).map((r) => ({
        id: r.user_id,
        email: "",
        username: "",
        role: r.role,
        created_at: "",
      }));
      setUsers(portalUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

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
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("create-portal-user", {
        body: { email: email.trim(), password, username: username.trim(), role },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

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

  const getRoleBadge = (role: string) => {
    if (role === "advanced") {
      return <Badge className="bg-amber-500/20 text-amber-700 border-amber-300"><Shield className="w-3 h-3 mr-1" /> Advanced</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-700 border-blue-300"><Eye className="w-3 h-3 mr-1" /> User</Badge>;
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
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
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Portal Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <p className="text-muted-foreground text-sm">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-sm">No portal users created yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">{u.id.slice(0, 8)}...</TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueControllerPortalPage;
