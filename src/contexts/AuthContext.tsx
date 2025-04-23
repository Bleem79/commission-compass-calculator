
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type UserRole = "guest" | "admin";

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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user) {
        checkUserRole(session.user.id, session.user.email || 'User');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper function to check user role
  const checkUserRole = async (userId: string, userEmail: string) => {
    try {
      console.log("Checking role for user:", userId);
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (roleError && roleError.code !== 'PGRST116') { // Not found is ok
        console.error("Error fetching user role:", roleError);
      }

      // Update user with Supabase user details and role
      console.log("Role data:", roleData, "setting user role to:", roleData ? 'admin' : 'guest');
      setUser({
        id: userId,
        username: userEmail,
        email: userEmail,
        role: roleData ? 'admin' : 'guest'
      });
    } catch (error) {
      console.error("Error in checkUserRole:", error);
      setUser({
        id: userId,
        username: userEmail,
        email: userEmail,
        role: 'guest' // Default to guest on error
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
