
import React, { createContext, useContext, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AuthContextType } from "@/types/auth";
import { useAuthState } from "@/hooks/useAuthState";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, session, refreshSession } = useAuthState();

  const logout = useCallback(async (): Promise<boolean> => {
    try {
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
  }, [session, setUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        logout,
        isAuthenticated: !!session,
        isAdmin: user?.role === "admin",
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
