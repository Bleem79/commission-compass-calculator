
import React, { createContext, useContext, useState, useEffect } from "react";

type UserRole = "guest" | "admin";

interface User {
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  loginAsGuest: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Check if user is already logged in (from session storage)
  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    // For demo purposes, only "admin" with password "admin123" can login as admin
    if (username === "admin" && password === "admin123") {
      const adminUser = { username, role: "admin" as UserRole };
      setUser(adminUser);
      sessionStorage.setItem("user", JSON.stringify(adminUser));
      return true;
    }
    return false;
  };

  const loginAsGuest = () => {
    const guestUser = { username: "Guest", role: "guest" as UserRole };
    setUser(guestUser);
    sessionStorage.setItem("user", JSON.stringify(guestUser));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginAsGuest,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin"
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
