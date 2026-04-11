"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  token: string | null;
  role: string | null;
  login: (token: string, role: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  role: null,
  login: () => {},
  logout: () => {},
  loading: true
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    const savedRole = localStorage.getItem("userRole");
    
    if (savedToken && savedRole) {
      setToken(savedToken);
      setRole(savedRole);
      
      // Auto redirect from root based on role
      if (pathname === "/") {
         if (savedRole === "RESIDENT") router.replace("/resident");
         else if (savedRole === "VENDOR") router.replace("/vendor");
         else if (savedRole === "SUPER_ADMIN") router.replace("/admin");
      }
    } else {
        if (pathname !== "/login" && pathname !== "/register" && pathname !== "/forgot-password") {
            router.push("/login");
        }
    }
    setLoading(false);
  }, [pathname, router]);

  const login = (newToken: string, newRole: string) => {
    localStorage.setItem("accessToken", newToken);
    localStorage.setItem("userRole", newRole);
    setToken(newToken);
    setRole(newRole);
    if (newRole === "RESIDENT") router.push("/resident");
    else if (newRole === "VENDOR") router.push("/vendor");
    else if (newRole === "SUPER_ADMIN") router.push("/admin");
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
    setToken(null);
    setRole(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ token, role, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
