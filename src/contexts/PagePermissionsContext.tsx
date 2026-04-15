import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PagePermissionsContextType {
  blockedPages: Set<string>;
  loading: boolean;
  isPageBlocked: (pageKey: string) => boolean;
}

const PagePermissionsContext = createContext<PagePermissionsContextType>({
  blockedPages: new Set(),
  loading: true,
  isPageBlocked: () => false,
});

export const usePagePermissions = () => useContext(PagePermissionsContext);

export const PagePermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, session } = useAuth();
  const [blockedPages, setBlockedPages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    const fetchBlocked = async () => {
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
    };

    fetchBlocked();
  }, [user?.id, user?.role, session]);

  const isPageBlocked = (pageKey: string) => blockedPages.has(pageKey);

  return (
    <PagePermissionsContext.Provider value={{ blockedPages, loading, isPageBlocked }}>
      {children}
    </PagePermissionsContext.Provider>
  );
};
