
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type UserRole = "guest" | "admin" | "user";

interface User {
  id?: string;
  username: string;
  email?: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        checkUserRole(session.user.id, session.user.email || 'User');
      }
    });

    // Listen for auth changes - optimized to minimize overhead
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Immediate state change for logout
        setUser(null);
      } else if (session?.user) {
        // For sign in, check user role immediately
        const userEmail = session.user.email || 'User';
        checkUserRole(session.user.id, userEmail);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper function to check user role
  const checkUserRole = async (userId: string, userEmail: string) => {
    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['admin', 'user'])
        .single();

      // Default to 'guest' if no specific role found
      const userRole: UserRole = roleData?.role || 'guest';

      // Update user state with the determined role
      setUser({
        id: userId,
        username: userEmail,
        email: userEmail,
        role: userRole
      });

      // Optionally toast for role change
      if (userRole === 'admin') {
        toast({
          title: "Admin Access Granted",
          description: "You now have administrative privileges"
        });
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      // Fallback to guest role if role check fails
      setUser({
        id: userId,
        username: userEmail,
        email: userEmail,
        role: 'guest'
      });
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error("Error during logout:", error);
      toast({
        title: "Logout Error",
        description: "An error occurred during logout",
        variant: "destructive"
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin"
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
