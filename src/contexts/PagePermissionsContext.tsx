import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PagePermissionsContextType {
  blockedPages: Set<string>;
  loading: boolean;
  isPageBlocked: (pageKey: string) => boolean;
  refetch: () => void;
}

const PagePermissionsContext = createContext<PagePermissionsContextType>({
  blockedPages: new Set(),
  loading: true,
  isPageBlocked: () => false,
  refetch: () => {},
});

export const usePagePermissions = () => useContext(PagePermissionsContext);

export const PagePermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, session } = useAuth();
  const [blockedPages, setBlockedPages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchBlocked = useCallback(async () => {
    if (!user?.id || !session) {
      setBlockedPages(new Set());
      setLoading(false);
      return;
    }

    // Only check for user/advanced roles (not admin/driver/guest)
    if (user.role === "admin" || user.role === "driver" || user.role === "guest") {
      setBlockedPages(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_page_permissions")
        .select("page_key")
        .eq("user_id", user.id);
      if (!error && data) {
        setBlockedPages(new Set(data.map((r: any) => r.page_key)));
      }
    } catch (err) {
      console.error("Error fetching page permissions:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, session]);

  useEffect(() => {
    fetchBlocked();
  }, [fetchBlocked]);

  // Subscribe to realtime changes for this user's permissions
  useEffect(() => {
    if (!user?.id || !session || user.role === "admin" || user.role === "driver" || user.role === "guest") return;

    const channel = supabase
      .channel('page-permissions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_page_permissions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchBlocked();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role, session, fetchBlocked]);

  const isPageBlocked = (pageKey: string) => blockedPages.has(pageKey);

  return (
    <PagePermissionsContext.Provider value={{ blockedPages, loading, isPageBlocked, refetch: fetchBlocked }}>
      {children}
    </PagePermissionsContext.Provider>
  );
};
