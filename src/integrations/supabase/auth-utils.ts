
import { supabase } from "./client";

/**
 * Signs in a user as a guest
 * Uses a fixed guest account for consistency
 * @returns Promise resolving to the signin result
 */
export const signInAsGuest = async () => {
  // Use a permanent guest email
  const guestEmail = "guest@amantaximena.com";
  
  // Fixed password for the guest account
  const guestPassword = "guest-password-123";
  
  try {
    // First attempt to sign in directly with the fixed credentials
    let { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: guestEmail,
      password: guestPassword,
    });
    
    // If sign in fails (e.g., account doesn't exist), create it first
    if (signInError) {
      console.log("Guest login failed, attempting to create guest account:", signInError.message);
      
      // Create the guest account
      const { error: signUpError } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
      });
      
      if (signUpError) {
        console.error("Error creating guest account:", signUpError);
        throw signUpError;
      }
      
      // Now try to sign in again
      const result = await supabase.auth.signInWithPassword({
        email: guestEmail,
        password: guestPassword,
      });
      
      if (result.error) {
        console.error("Failed to sign in after creating guest account:", result.error);
        throw result.error;
      }
      
      data = result.data;
    }
    
    return data;
  } catch (error) {
    console.error("Guest login failed:", error);
    throw error;
  }
};
