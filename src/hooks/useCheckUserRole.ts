
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User } from "@/types/auth";

export const useCheckUserRole = (setUser: React.Dispatch<React.SetStateAction<User | null>>) => {
  return async (userId: string, userEmail: string) => {
    try {
      // Specific check for erico.ariata@outlook.com
      if (userEmail === 'erico.ariata@outlook.com') {
        console.log("Found specific user erico.ariata@outlook.com - setting as admin");
        setUser({
          id: userId,
          username: userEmail,
          email: userEmail,
          role: 'admin'
        });
        
        // Only show admin toast on initial login, not on session refreshes
        if (!sessionStorage.getItem('adminNotificationShown')) {
          toast({
            title: "Admin Access Granted",
            description: "You now have administrative privileges"
          });
          sessionStorage.setItem('adminNotificationShown', 'true');
        }
        
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
      
      try {
        // Attempt to fetch the user role from the database
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (roleError) {
          console.log("Error fetching user role, checking if user is a driver");
          
          // If no role found, check if user has driver credentials
          const { data: driverData, error: driverError } = await supabase
            .from('driver_credentials')
            .select('driver_id')
            .eq('user_id', userId)
            .maybeSingle();
            
          if (!driverError && driverData) {
            console.log("User identified as driver with ID:", driverData.driver_id);
            setUser({
              id: userId,
              username: userEmail,
              email: userEmail,
              role: 'driver'
            });
            return;
          }
          
          // Default to guest if no specific role found
          console.log("No specific role found for user, defaulting to guest");
          setUser({
            id: userId,
            username: userEmail,
            email: userEmail,
            role: 'guest'
          });
          return;
        }

        if (roleData) {
          const userRole = roleData.role;
          
          setUser({
            id: userId,
            username: userEmail,
            email: userEmail,
            role: userRole
          });

          if (userRole === 'admin' && !sessionStorage.getItem('adminNotificationShown')) {
            toast({
              title: "Admin Access Granted",
              description: "You now have administrative privileges"
            });
            sessionStorage.setItem('adminNotificationShown', 'true');
          }
          
          console.log("User role set to:", userRole);
        } else {
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
        setUser({
          id: userId,
          username: userEmail,
          email: userEmail,
          role: 'guest'
        });
      }
    } catch (error) {
      console.error("Error in checkUserRole function:", error);
      setUser({
        id: userId,
        username: userEmail,
        email: userEmail,
        role: 'guest'
      });
    }
  };
};
