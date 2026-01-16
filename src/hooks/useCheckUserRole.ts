
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User } from "@/types/auth";

export const useCheckUserRole = (setUser: React.Dispatch<React.SetStateAction<User | null>>) => {
  return async (userId: string, userEmail: string) => {
    try {
      // Specific check for admin emails
      const adminEmails = ['erico.ariata@outlook.com', 'binu@amantaxi.com', 'rev.counter@amantaximena.com'];
      if (adminEmails.includes(userEmail.toLowerCase())) {
        console.log("Found admin user - setting as admin:", userEmail);
        setUser(prevUser => {
          // Only update if role is different or user is null
          if (!prevUser || prevUser.role !== 'admin') {
            return {
              id: userId,
              username: userEmail,
              email: userEmail,
              role: 'admin'
            };
          }
          return prevUser;
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
      
      // Check for our permanent guest account
      if (userEmail === 'guest@amantaximena.com') {
        console.log("Permanent guest account detected - setting role as guest");
        setUser(prevUser => {
          // Only update if role is different or user is null
          if (!prevUser || prevUser.role !== 'guest') {
            return {
              id: userId,
              username: "Guest User",
              email: userEmail,
              role: 'guest'
            };
          }
          return prevUser;
        });
        return;
      }
      
      try {
        // Attempt to fetch the user role from the database
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (roleError || !roleData) {
          console.log("Error fetching user role or no role found, checking if user is a driver");
          
          // If no role found, check if user has driver credentials
          const { data: driverData, error: driverError } = await supabase
            .from('driver_credentials')
            .select('driver_id')
            .eq('user_id', userId)
            .maybeSingle();
            
          if (!driverError && driverData) {
            console.log("User identified as driver with ID:", driverData.driver_id);
            setUser(prevUser => {
              // Only update if role is different or user is null
              if (!prevUser || prevUser.role !== 'driver' || prevUser.driverId !== driverData.driver_id) {
                return {
                  id: userId,
                  username: userEmail,
                  email: userEmail,
                  role: 'driver',
                  driverId: driverData.driver_id
                };
              }
              return prevUser;
            });
            return;
          }
          
          // Default to guest if no specific role found
          console.log("No specific role found for user, defaulting to guest");
          setUser(prevUser => {
            // Only update if role is different or user is null
            if (!prevUser || prevUser.role !== 'guest') {
              return {
                id: userId,
                username: userEmail,
                email: userEmail,
                role: 'guest'
              };
            }
            return prevUser;
          });
          return;
        }

        if (roleData) {
          const userRole = roleData.role;
          
          setUser(prevUser => {
            // Only update if role is different or user is null
            if (!prevUser || prevUser.role !== userRole) {
              return {
                id: userId,
                username: userEmail,
                email: userEmail,
                role: userRole
              };
            }
            return prevUser;
          });

          if (userRole === 'admin' && !sessionStorage.getItem('adminNotificationShown')) {
            toast({
              title: "Admin Access Granted",
              description: "You now have administrative privileges"
            });
            sessionStorage.setItem('adminNotificationShown', 'true');
          }
          
          console.log("User role set to:", userRole);
        }
      } catch (error) {
        console.error("Error checking user role in database:", error);
        setUser(prevUser => {
          // Only update if role is different or user is null
          if (!prevUser || prevUser.role !== 'guest') {
            return {
              id: userId,
              username: userEmail,
              email: userEmail,
              role: 'guest'
            };
          }
          return prevUser;
        });
      }
    } catch (error) {
      console.error("Error in checkUserRole function:", error);
      setUser(prevUser => {
        // Only update if role is different or user is null
        if (!prevUser || prevUser.role !== 'guest') {
          return {
            id: userId,
            username: userEmail,
            email: userEmail,
            role: 'guest'
          };
        }
        return prevUser;
      });
    }
  };
};
