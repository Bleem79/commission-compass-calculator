
import { supabase } from "./client";

/**
 * Signs in a user as a guest
 * Creates a temporary guest account with Supabase
 * @returns Promise resolving to the signin result
 */
export const signInAsGuest = async () => {
  // Generate a unique guest email with timestamp to avoid collisions
  const timestamp = Date.now();
  const guestEmail = `guest_${timestamp}@amantaximena.com`;
  
  // Generate a random password (this won't be needed by the guest later)
  const guestPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  
  try {
    // First create the guest account
    const { error: signUpError } = await supabase.auth.signUp({
      email: guestEmail,
      password: guestPassword,
    });
    
    if (signUpError) {
      console.error("Error creating guest account:", signUpError);
      throw signUpError;
    }
    
    // Then sign in with the created account
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: guestEmail,
      password: guestPassword,
    });
    
    if (signInError) {
      console.error("Error signing in as guest:", signInError);
      throw signInError;
    }
    
    return data;
  } catch (error) {
    console.error("Guest login failed:", error);
    throw error;
  }
};
