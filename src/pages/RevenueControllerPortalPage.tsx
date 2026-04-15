import React, { useState } from "react";
import { UserPlus, Users, Shield, Eye, Loader2, RefreshCw, Camera, Bell, BellOff, BellRing, KeyRound, Dices, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PageLayout } from "@/components/shared/PageLayout";
import { usePortalUsers } from "@/hooks/usePortalUsers";
import { PagePermissionsDialog } from "@/components/admin/PagePermissionsDialog";

const RevenueControllerPortalPage = () => {
  const {
    isAdmin, users, loadingUsers, updatingUserId, uploadingAvatarId, fileInputRef,
    subscribedUserIds, resetPasswordUserId, setResetPasswordUserId, newPassword, setNewPassword,
    resettingPassword, username, setUsername, email, setEmail, password, setPassword,
    role, setRole, isCreating, isSupported, isGranted, isDenied,
    fetchUsers, handleEnableNotifications, handleCreateUser, handleRoleChange,
    handleToggleStatus, handleAvatarClick, handleAvatarUpload, generateRandomPassword,
    handleResetPassword,
  } = usePortalUsers();

  const [permissionsUser, setPermissionsUser] = useState<{ id: string; username: string } | null>(null);

  const getRoleBadge = (userRole: string) => {
    if (userRole === "advanced") return <Badge className="bg-amber-500/20 text-amber-700 border-amber-300"><Shield className="w-3 h-3 mr-1" /> Advanced</Badge>;
    return <Badge className="bg-primary/20 text-primary border-primary/30"><Eye className="w-3 h-3 mr-1" /> User</Badge>;
  };

  if (!isAdmin) return null;

  return (
    <PageLayout
      title="Revenue Controller Portal"
      icon={<Shield className="h-6 w-6" />}
      gradient="from-background via-purple-50/50 to-slate-50/50"
      headerActions={
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loadingUsers}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loadingUsers ? "animate-spin" : ""}`} /> Refresh
        </Button>
      }
    >
      {/* Push Notifications Card */}
      <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                {isGranted ? <BellRing className="w-5 h-5 text-orange-600" /> : <BellOff className="w-5 h-5 text-orange-400" />}
              </div>
              <div>
                <h3 className="font-semibold text-orange-800">Push Notifications</h3>
                <p className="text-sm text-orange-700">
                  {isGranted ? "You're receiving push notifications for new driver requests" : isDenied ? "Notifications are blocked. Enable them in your browser settings" : "Enable push notifications to get alerts for new driver requests"}
                </p>
              </div>
            </div>
            {!isGranted && !isDenied && isSupported && (
              <Button onClick={handleEnableNotifications} className="bg-orange-600 hover:bg-orange-700 text-white shrink-0" size="sm"><Bell className="w-4 h-4 mr-1.5" /> Enable</Button>
            )}
            {isGranted && <Badge className="bg-green-500/20 text-green-700 border-green-300 shrink-0"><Bell className="w-3 h-3 mr-1" /> Active</Badge>}
            {isDenied && <Badge className="bg-destructive/20 text-destructive border-destructive/30 shrink-0"><BellOff className="w-3 h-3 mr-1" /> Blocked</Badge>}
          </div>
          {subscribedUserIds.size > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-200">
              <p className="text-xs text-orange-600"><Bell className="w-3 h-3 inline mr-1" />{subscribedUserIds.size} device{subscribedUserIds.size !== 1 ? "s" : ""} registered for notifications</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="w-8 h-8 text-amber-600 shrink-0 mt-1" />
            <div><h3 className="font-semibold text-amber-800">Advanced Role</h3><p className="text-sm text-amber-700">Full access to all pages. Cannot delete records or upload files.</p></div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Eye className="w-8 h-8 text-primary shrink-0 mt-1" />
            <div><h3 className="font-semibold text-primary">User Role</h3><p className="text-sm text-primary/70">View-only access to all admin pages. Cannot modify any data.</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Create User Form */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Create New User</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="username">Username</Label><Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" /></div>
              <div className="space-y-2"><Label htmlFor="email">Email Address</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" /></div>
              <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" /></div>
              <div className="space-y-2"><Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent><SelectItem value="advanced">Advanced - Full access (no delete/upload)</SelectItem><SelectItem value="user">User - View only</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={isCreating} className="w-full sm:w-auto">{isCreating ? "Creating..." : "Create User"}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Portal Users ({users.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground text-sm">Loading users...</span></div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No portal users created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className={u.banned ? "opacity-50" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="relative group cursor-pointer" onClick={() => handleAvatarClick(u.id)}>
                            <Avatar className="h-8 w-8"><AvatarImage src={u.avatar_url} alt={u.username} /><AvatarFallback className="text-xs bg-primary/10 text-primary">{(u.username || "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {uploadingAvatarId === u.id ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <Camera className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          {u.username || <span className="text-muted-foreground italic">No username</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{u.email || <span className="text-muted-foreground italic">—</span>}</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(newRole) => handleRoleChange(u.id, newRole)} disabled={updatingUserId === u.id}>
                          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="advanced"><div className="flex items-center gap-1"><Shield className="w-3 h-3" /> Advanced</div></SelectItem>
                            <SelectItem value="user"><div className="flex items-center gap-1"><Eye className="w-3 h-3" /> User</div></SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Badge className={u.banned ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-green-500/20 text-green-700 border-green-300"}>{u.banned ? "Disabled" : "Active"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setPermissionsUser({ id: u.id, username: u.username })} title="Page access"><Lock className="w-3 h-3" /></Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setResetPasswordUserId(resetPasswordUserId === u.id ? null : u.id); setNewPassword(""); }}><KeyRound className="w-3 h-3" /> Reset</Button>
                          <Switch checked={!u.banned} onCheckedChange={() => handleToggleStatus(u.id, u.banned)} disabled={updatingUserId === u.id} />
                          {updatingUserId === u.id && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                        {resetPasswordUserId === u.id && (
                          <div className="mt-2 flex items-center gap-1.5 justify-end">
                            <Input type="text" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-7 text-xs w-32" />
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={generateRandomPassword} title="Generate random password"><Dices className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleResetPassword(u.id)} disabled={resettingPassword || !newPassword.trim()}>
                              {resettingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {permissionsUser && (
        <PagePermissionsDialog
          open={!!permissionsUser}
          onOpenChange={(open) => { if (!open) setPermissionsUser(null); }}
          userId={permissionsUser.id}
          username={permissionsUser.username}
        />
      )}
    </PageLayout>
  );
};

export default RevenueControllerPortalPage;
