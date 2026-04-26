
import React, { createContext, useContext, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AuthContextType } from "@/types/auth";
import { useAuthState } from "@/hooks/useAuthState";
import {
  useActivityLogger,
  getActivitySession,
  clearActivitySession,
  saveActivitySession,
} from "@/hooks/useActivityLogger";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, session, refreshSession } = useAuthState();
  const { logActivity } = useActivityLogger();

  // Keep persisted activity session in sync with auth state, so logout can
  // always be attributed to the correct driver even if `user` is cleared.
  useEffect(() => {
    if (session?.user && user) {
      const driverId =
        user.driverId ||
        (user.email?.includes("@driver.temp")
          ? user.email.split("@")[0]
          : user.role === "guest"
          ? "Guest"
          : user.username);
      if (driverId && driverId !== "Guest") {
        saveActivitySession(session.user.id, driverId);
      }
    }
  }, [session?.user?.id, user?.driverId, user?.username, user?.email, user?.role]);

  // Listen for any SIGNED_OUT event (manual logout, session expiry, token refresh
  // failure, sign-out from another tab) and record a logout entry exactly once.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          const info = getActivitySession();
          if (info && info.driverId && info.driverId !== "Guest") {
            // Fire and forget - dedup guard inside logActivity prevents
            // double-logging when the explicit logout() also fired.
            logActivity(info.userId, info.driverId, "logout").finally(() => {
              clearActivitySession();
            });
          } else {
            clearActivitySession();
          }
        }
      }
    );
    return () => {
      subscription.unsubscribe();
    };
  }, [logActivity]);

  // Best-effort logout logging when the user closes the tab/browser.
  // Uses sendBeacon so the request goes out even during page unload.
  useEffect(() => {
    const sendLogoutBeacon = () => {
      const info = getActivitySession();
      if (!info || !info.driverId || info.driverId === "Guest") return;
      try {
        const SUPABASE_URL = "https://iahpiswzhkshejncylvt.supabase.co";
        const SUPABASE_KEY =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhaHBpc3d6aGtzaGVqbmN5bHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwNzgwNzMsImV4cCI6MjA2MDY1NDA3M30.KOrHbCrL8bDregbGgHFsyJ84FdH0_UL-YUJNSPEtARQ";
        const accessToken = session?.access_token;
        if (!accessToken) return;
        const payload = JSON.stringify({
          user_id: info.userId,
          driver_id: info.driverId,
          activity_type: "logout",
          user_agent: navigator.userAgent,
          ip_address: null,
        });
        const blob = new Blob([payload], {
          type: "application/json",
        });
        // sendBeacon doesn't support custom headers, so we use fetch with keepalive.
        fetch(`${SUPABASE_URL}/rest/v1/driver_activity_logs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${accessToken}`,
            Prefer: "return=minimal",
          },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      } catch {}
    };

    const handlePageHide = () => sendLogoutBeacon();
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [session?.access_token]);

  const logout = useCallback(async (): Promise<boolean> => {
    try {
      // Log logout activity before signing out
      if (session?.user && user) {
        // Use stored driverId if available, otherwise extract from email/username
        const driverId = user.driverId || (user.email?.includes("@driver.temp") 
          ? user.email.split("@")[0] 
          : (user.role === 'guest' ? 'Guest' : user.username));
        await logActivity(session.user.id, driverId, "logout");
      }
      
      // Clear admin notification flag before logging out
      sessionStorage.removeItem('adminNotificationShown');
      
      // If there's no active session, just clear the user state and return success
      if (!session) {
        console.log("No active session found during logout, clearing user state only");
        setUser(null);
        toast({
          title: "Logged out",
          description: "You have been successfully logged out"
        });
        return true;
      }
      
      // Sign out from Supabase with error handling
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase logout error:", error);
        
        // If the error is about missing session, still clear local state and consider it successful
        if (error.message.includes("session missing") || error.message.includes("Auth session missing")) {
          console.log("Session missing error, but proceeding with local logout");
          setUser(null);
          toast({
            title: "Logged out",
            description: "You have been successfully logged out"
          });
          return true;
        }
        
        toast({
          title: "Logout Error",
          description: "An error occurred during logout: " + error.message,
          variant: "destructive"
        });
        return false;
      }
      
      // Clear user state
      setUser(null);
      
      // Show success toast
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
      
      return true;
    } catch (error) {
      console.error("Error during logout:", error);
      
      // Even if there's an error, clear the user state to ensure local logout
      setUser(null);
      
      toast({
        title: "Note",
        description: "You have been logged out locally, but there was a server error."
      });
      
      // Return true so user is redirected to login page regardless of server errors
      return true;
    }
  }, [session, setUser, user, logActivity]);

  const isAdmin = user?.role === "admin";
  const isAdvanced = user?.role === "advanced";
  const canAccessAdminPages = isAdmin || isAdvanced || user?.role === "user";

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        logout,
        isAuthenticated: !!session,
        isAdmin,
        isAdvanced,
        canAccessAdminPages,
        session,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
