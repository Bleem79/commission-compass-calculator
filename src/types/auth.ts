
import { Session } from "@supabase/supabase-js";

export type UserRole = "guest" | "admin" | "user" | "driver";

export interface User {
  id?: string;
  username: string;
  email?: string;
  role: UserRole;
}

export interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  session: Session | null;
  refreshSession: () => Promise<void>;
}
