
import React, { createContext, useContext } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AuthContextType } from "@/types/auth";
import { useAuthState } from "@/hooks/useAuthState";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, session, refreshSession } = useAuthState();

  const logout = async (): Promise<boolean> => {
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
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Supabase logout error:", error);
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
      toast({
        title: "Logout Error",
        description: "An unexpected error occurred during logout",
        variant: "destructive"
      });
      return false;
    }
  };

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
