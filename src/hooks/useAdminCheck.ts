import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UseAdminCheckResult {
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Hook to check if the current user has admin privileges.
 * Redirects to home if not an admin and shows an error toast.
 */
export const useAdminCheck = (redirectOnFail = true): UseAdminCheckResult => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "advanced", "user"])
          .maybeSingle();

        if (error) throw error;
        
        const hasAdminRole = !!data;
        setIsAdmin(hasAdminRole);

        if (!hasAdminRole && redirectOnFail) {
          toast.error("Access denied. Admin privileges required.");
          navigate("/home", { replace: true });
        }
      } catch (error: any) {
        console.error("Error checking admin role:", error);
        if (redirectOnFail) {
          navigate("/home", { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [user?.id, navigate, redirectOnFail]);

  return { isAdmin, loading };
};
