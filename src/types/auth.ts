
export type UserRole = "guest" | "admin" | "user" | "driver" | "advanced";

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
  logout: () => Promise<boolean>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAdvanced: boolean;
  canAccessAdminPages: boolean;
  session: Session | null;
  refreshSession: () => Promise<void>;
}

import { Session } from "@supabase/supabase-js";
