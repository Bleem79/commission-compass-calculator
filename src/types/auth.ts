
export type UserRole = "guest" | "admin" | "user" | "driver";

export interface User {
  id?: string;
  username: string;
  email?: string;
  role: UserRole;
  driverId?: string;
}

export interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => Promise<boolean>; // Explicitly define Promise<boolean> return type
  isAuthenticated: boolean;
  isAdmin: boolean;
  session: Session | null;
  refreshSession: () => Promise<void>;
}

import { Session } from "@supabase/supabase-js";
