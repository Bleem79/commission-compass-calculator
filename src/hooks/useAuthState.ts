
import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/auth";
import { useCheckUserRole } from "./useCheckUserRole";

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const checkUserRole = useCheckUserRole(setUser);

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
        console.log("User signed out, clearing auth state");
        setUser(null);
        // Clear admin notification flag when user signs out
        sessionStorage.removeItem('adminNotificationShown');
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.user) {
        console.log("User signed in or token refreshed:", newSession.user.email);
        const userEmail = newSession.user.email || 'User';
        
        setTimeout(() => {
          checkUserRole(newSession.user.id, userEmail);
        }, 0);
      } else if (event === 'USER_UPDATED') {
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
    
    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [checkUserRole]);

  return { user, setUser, session, refreshSession };
};
