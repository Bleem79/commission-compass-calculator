
import { useState, useEffect, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/auth";
import { useCheckUserRole } from "./useCheckUserRole";

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const checkUserRole = useCheckUserRole(setUser);
  const roleCheckInProgress = useRef(false);

  const refreshSession = async () => {
    try {
      const { data } = await supabase.auth.refreshSession();
      setSession(data.session);
      
      if (data.session?.user && !roleCheckInProgress.current) {
        roleCheckInProgress.current = true;
        try {
          await checkUserRole(data.session.user.id, data.session.user.email || 'User');
        } finally {
          roleCheckInProgress.current = false;
        }
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
      roleCheckInProgress.current = false;
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
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.user && !roleCheckInProgress.current) {
        console.log("User signed in or token refreshed:", newSession.user.email);
        const userEmail = newSession.user.email || 'User';
        
        // Prevent concurrent role checks
        if (!roleCheckInProgress.current) {
          roleCheckInProgress.current = true;
          // Use a normal function call instead of setTimeout to reduce flickering
          checkUserRole(newSession.user.id, userEmail)
            .finally(() => {
              roleCheckInProgress.current = false;
            });
        }
      }
    });
    
    // THEN check for existing session
    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        setSession(initialSession);
        
        if (initialSession?.user && !roleCheckInProgress.current) {
          console.log("Initial session found for:", initialSession.user.email);
          roleCheckInProgress.current = true;
          try {
            await checkUserRole(initialSession.user.id, initialSession.user.email || 'User');
          } finally {
            roleCheckInProgress.current = false;
          }
        } else {
          console.log("No initial session found");
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking initial session:", error);
        roleCheckInProgress.current = false;
      }
    };
    
    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [checkUserRole]);

  return { user, setUser, session, refreshSession };
};
