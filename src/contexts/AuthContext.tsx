
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // First check if session exists
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("Initial session found for:", session.user.email);
          await checkUserRole(session.user.id, session.user.email || 'User');
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

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      if (event === 'SIGNED_OUT') {
        // Immediate state change for logout
        console.log("User signed out, clearing auth state");
        setUser(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // For sign in, check user role
        console.log("User signed in:", session.user.email);
        const userEmail = session.user.email || 'User';
        await checkUserRole(session.user.id, userEmail);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Handle token refresh to maintain session
        console.log("Token refreshed for:", session.user.email);
        const userEmail = session.user.email || 'User';
        await checkUserRole(session.user.id, userEmail);
      }
    });

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
      
      // For all other users, check the database
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (roleError) {
          if (roleError.code !== 'PGRST116') { // Not found error
            console.error("Error fetching user role:", roleError);
          }
          
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
