
import { useState, useEffect, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/auth";
import { useCheckUserRole } from "./useCheckUserRole";

// Helper to clear auth error params from URL (from external redirects)
const clearAuthErrorParams = () => {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  const errorParams = ['error', 'error_code', 'error_description'];
  let hasErrorParams = false;
  
  errorParams.forEach(param => {
    if (url.searchParams.has(param)) {
      hasErrorParams = true;
      url.searchParams.delete(param);
    }
  });
  
  if (hasErrorParams) {
    console.log("Clearing auth error params from URL");
    window.history.replaceState({}, '', url.pathname + url.search);
  }
};

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const checkUserRole = useCheckUserRole(setUser);
  const roleCheckInProgress = useRef(false);
  const initialCheckComplete = useRef(false);

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
    // Prevent multiple initializations
    if (initialCheckComplete.current) return;
    
    // Clear any auth error params from URL (from external app redirects)
    clearAuthErrorParams();
    
    // Set up auth state change listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth state changed:", event);
      
      // Don't update state if there's no change to avoid re-renders
      if (JSON.stringify(session) === JSON.stringify(newSession)) {
        console.log("Session unchanged, skipping update");
        return;
      }
      
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
    
    // THEN check for existing session, but only once
    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        // Only update state if there's an actual change
        if (JSON.stringify(session) !== JSON.stringify(initialSession)) {
          setSession(initialSession);
        }
        
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
        
        // Mark initial check as complete to prevent duplicate initialization
        initialCheckComplete.current = true;
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
