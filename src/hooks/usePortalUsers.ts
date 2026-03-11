import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePushSubscriptionRegistration } from "@/hooks/usePushSubscriptionRegistration";

export interface PortalUser {
  id: string;
  email: string;
  username: string;
  avatar_url: string;
  role: string;
  created_at: string;
  banned: boolean;
}

export const usePortalUsers = () => {
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
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const { isSupported, isGranted, isDenied, requestPermission } = usePushNotifications();
  usePushSubscriptionRegistration(user?.id, null);

  useEffect(() => {
    if (!isAdmin) { navigate("/home", { replace: true }); return; }
    fetchUsers(); fetchSubscriptions();
  }, [isAdmin, navigate]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await supabase.functions.invoke("create-portal-user", { body: { action: "list" } });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      setUsers(response.data.users || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally { setLoadingUsers(false); }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("push_subscriptions").select("user_id");
      if (!error && data) setSubscribedUserIds(new Set(data.map((s) => s.user_id)));
    } catch (err) { console.error("Error fetching subscriptions:", err); }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) setTimeout(() => fetchSubscriptions(), 2000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim() || !role) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" }); return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" }); return;
    }
    setIsCreating(true);
    try {
      const response = await supabase.functions.invoke("create-portal-user", {
        body: { action: "create", email: email.trim(), password, username: username.trim(), role },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Success", description: `User "${username}" created with ${role} role` });
      setUsername(""); setEmail(""); setPassword(""); setRole("");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create user", variant: "destructive" });
    } finally { setIsCreating(false); }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      const response = await supabase.functions.invoke("create-portal-user", { body: { action: "change_role", user_id: userId, new_role: newRole } });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast({ title: "Success", description: `Role updated to ${newRole}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update role", variant: "destructive" });
    } finally { setUpdatingUserId(null); }
  };

  const handleToggleStatus = async (userId: string, currentlyBanned: boolean) => {
    setUpdatingUserId(userId);
    try {
      const response = await supabase.functions.invoke("create-portal-user", { body: { action: "toggle_status", user_id: userId, disable: !currentlyBanned } });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, banned: !currentlyBanned } : u)));
      toast({ title: "Success", description: currentlyBanned ? "User enabled" : "User disabled" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to toggle status", variant: "destructive" });
    } finally { setUpdatingUserId(null); }
  };

  const handleAvatarClick = (userId: string) => {
    setAvatarTargetUserId(userId);
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !avatarTargetUserId) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" }); return;
    }
    setUploadingAvatarId(avatarTargetUserId);
    try {
      const filePath = `${avatarTargetUserId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("user-avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("user-avatars").getPublicUrl(filePath);
      const response = await supabase.functions.invoke("create-portal-user", { body: { action: "update_avatar", user_id: avatarTargetUserId, avatar_url: publicUrl } });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      setUsers((prev) => prev.map((u) => (u.id === avatarTargetUserId ? { ...u, avatar_url: publicUrl } : u)));
      toast({ title: "Success", description: "Photo updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingAvatarId(null); setAvatarTargetUserId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const generateRandomPassword = useCallback(() => {
    setNewPassword(Math.floor(100000 + Math.random() * 900000).toString());
  }, []);

  const handleResetPassword = async (userId: string) => {
    if (!newPassword.trim() || newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" }); return;
    }
    setResettingPassword(true);
    try {
      const response = await supabase.functions.invoke("create-portal-user", { body: { action: "reset_password", user_id: userId, new_password: newPassword.trim() } });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Success", description: "Password has been reset" });
      setResetPasswordUserId(null); setNewPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reset password", variant: "destructive" });
    } finally { setResettingPassword(false); }
  };

  return {
    isAdmin, users, loadingUsers, updatingUserId, uploadingAvatarId, fileInputRef,
    subscribedUserIds, resetPasswordUserId, setResetPasswordUserId, newPassword, setNewPassword,
    resettingPassword, username, setUsername, email, setEmail, password, setPassword,
    role, setRole, isCreating, isSupported, isGranted, isDenied,
    fetchUsers, handleEnableNotifications, handleCreateUser, handleRoleChange,
    handleToggleStatus, handleAvatarClick, handleAvatarUpload, generateRandomPassword,
    handleResetPassword,
  };
};
