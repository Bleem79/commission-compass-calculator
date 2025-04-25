
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

type UserRole = "guest" | "admin" | "user" | "driver";

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
  session: Session | null;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // Add function to refresh session
  const refreshSession = async () => {
    try {
      const { data } = await supabase.auth.refreshSession();
      setSession(data.session);
      if (data.session?.user) {
        await checkUserRole(data.session.user.id, data.session.user.email || 'User');
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  };

  useEffect(() => {
    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state changed:", event);
      
      setSession(newSession);
      
      if (event === 'SIGNED_OUT') {
        // Immediate state change for logout
        console.log("User signed out, clearing auth state");
        setUser(null);
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.user) {
        // For sign in, check user role - but use setTimeout to avoid potential deadlock
        console.log("User signed in or token refreshed:", newSession.user.email);
        const userEmail = newSession.user.email || 'User';
        
        // Use setTimeout to avoid potential deadlock
        setTimeout(() => {
          checkUserRole(newSession.user.id, userEmail);
        }, 0);
      } else if (event === 'USER_UPDATED') {
        // Handle email verification
        if (newSession?.user) {
          setTimeout(() => {
            checkUserRole(newSession.user.id, newSession.user.email || 'User');
          }, 0);
        }
      }
    });
    
    // THEN check for existing session
    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        setSession(initialSession);
        
        if (initialSession?.user) {
          console.log("Initial session found for:", initialSession.user.email);
          await checkUserRole(initialSession.user.id, initialSession.user.email || 'User');
        } else {
          console.log("No initial session found");
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking initial session:", error);
      }
    };
    
    // Run the initial session check
    checkInitialSession();

    // Clean up the subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper function to check user role
  const checkUserRole = async (userId: string, userEmail: string) => {
    try {
      console.log("Checking role for:", userEmail);
      
      // Specific check for erico.ariata@outlook.com
      if (userEmail === 'erico.ariata@outlook.com') {
        console.log("Found specific user erico.ariata@outlook.com - setting as admin");
        setUser({
          id: userId,
          username: userEmail,
          email: userEmail,
          role: 'admin'
        });
        
        toast({
          title: "Admin Access Granted",
          description: "You now have administrative privileges"
        });
        
        return;
      }
      
      // Check for guest account
      if (userEmail === 'guest@amantaximena.com') {
        console.log("Guest account detected - setting role as guest");
        setUser({
          id: userId,
          username: "Guest User",
          email: userEmail,
          role: 'guest'
        });
        return;
      }
      
      // For all other users, try to check the database but handle errors gracefully
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (roleError) {
          console.log("No specific role found for user, defaulting to guest");
          // Default to 'guest' if role check fails or no role found
          setUser({
            id: userId,
            username: userEmail,
            email: userEmail,
            role: 'guest'
          });
          return;
        }

        // Check if we got role data
        if (roleData) {
          const userRole: UserRole = roleData.role;
          
          // Update user state with the determined role
          setUser({
            id: userId,
            username: userEmail,
            email: userEmail,
            role: userRole
          });

          // Only toast for admin role
          if (userRole === 'admin') {
            toast({
              title: "Admin Access Granted",
              description: "You now have administrative privileges"
            });
          }
          
          // Debug the role that was found
          console.log("User role set to:", userRole);
        } else {
          // No role found, set as guest
          console.log("No role found for user, defaulting to guest");
          setUser({
            id: userId,
            username: userEmail,
            email: userEmail,
            role: 'guest'
          });
        }
      } catch (error) {
        console.error("Error checking user role in database:", error);
        // Fallback to guest role
        setUser({
          id: userId,
          username: userEmail,
          email: userEmail,
          role: 'guest'
        });
      }
    } catch (error) {
      console.error("Error in checkUserRole function:", error);
      // Fallback to guest role
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
      setSession(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error("Error during logout:", error);
      toast({
        title: "Logout Error",
        description: "An unexpected error occurred during logout",
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
