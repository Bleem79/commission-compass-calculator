import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus, Users, Shield, Eye, Loader2, RefreshCw, Camera, Bell, BellOff, BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePushSubscriptionRegistration } from "@/hooks/usePushSubscriptionRegistration";

interface PortalUser {
  id: string;
  email: string;
  username: string;
  avatar_url: string;
  role: string;
  created_at: string;
  banned: boolean;
}

const RevenueControllerPortalPage = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [uploadingAvatarId, setUploadingAvatarId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarTargetUserId, setAvatarTargetUserId] = useState<string | null>(null);
  const [subscribedUserIds, setSubscribedUserIds] = useState<Set<string>>(new Set());

  const { isSupported, isGranted, isDenied, requestPermission } = usePushNotifications();
  usePushSubscriptionRegistration(user?.id, null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/home", { replace: true });
      return;
    }
    fetchUsers();
    fetchSubscriptions();
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

  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("user_id");
      if (!error && data) {
        setSubscribedUserIds(new Set(data.map((s) => s.user_id)));
      }
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      setTimeout(() => fetchSubscriptions(), 2000);
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

  const handleAvatarClick = (userId: string) => {
    setAvatarTargetUserId(userId);
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !avatarTargetUserId) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    setUploadingAvatarId(avatarTargetUserId);
    try {
      const filePath = `${avatarTargetUserId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-avatars")
        .getPublicUrl(filePath);

      const response = await supabase.functions.invoke("create-portal-user", {
        body: { action: "update_avatar", user_id: avatarTargetUserId, avatar_url: publicUrl },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setUsers((prev) =>
        prev.map((u) => (u.id === avatarTargetUserId ? { ...u, avatar_url: publicUrl } : u))
      );
      toast({ title: "Success", description: "Photo updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingAvatarId(null);
      setAvatarTargetUserId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

        {/* Push Notifications Card */}
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  {isGranted ? (
                    <BellRing className="w-5 h-5 text-orange-600" />
                  ) : (
                    <BellOff className="w-5 h-5 text-orange-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800">Push Notifications</h3>
                  <p className="text-sm text-orange-700">
                    {isGranted
                      ? "You're receiving push notifications for new driver requests"
                      : isDenied
                      ? "Notifications are blocked. Enable them in your browser settings"
                      : "Enable push notifications to get alerts for new driver requests"}
                  </p>
                </div>
              </div>
              {!isGranted && !isDenied && isSupported && (
                <Button
                  onClick={handleEnableNotifications}
                  className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                  size="sm"
                >
                  <Bell className="w-4 h-4 mr-1.5" />
                  Enable
                </Button>
              )}
              {isGranted && (
                <Badge className="bg-green-500/20 text-green-700 border-green-300 shrink-0">
                  <Bell className="w-3 h-3 mr-1" /> Active
                </Badge>
              )}
              {isDenied && (
                <Badge className="bg-red-500/20 text-red-700 border-red-300 shrink-0">
                  <BellOff className="w-3 h-3 mr-1" /> Blocked
                </Badge>
              )}
            </div>

            {/* Subscribed users summary */}
            {subscribedUserIds.size > 0 && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <p className="text-xs text-orange-600">
                  <Bell className="w-3 h-3 inline mr-1" />
                  {subscribedUserIds.size} device{subscribedUserIds.size !== 1 ? "s" : ""} registered for notifications
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
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
                          <div className="flex items-center gap-2">
                            <div className="relative group cursor-pointer" onClick={() => handleAvatarClick(u.id)}>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={u.avatar_url} alt={u.username} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {(u.username || "?").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploadingAvatarId === u.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                                ) : (
                                  <Camera className="w-3 h-3 text-white" />
                                )}
                              </div>
                            </div>
                            {u.username || <span className="text-muted-foreground italic">No username</span>}
                          </div>
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
