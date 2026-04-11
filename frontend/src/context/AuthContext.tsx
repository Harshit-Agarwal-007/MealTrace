"use client";

/**
 * AuthContext — MealTrace
 *
 * Manages JWT session state. On mount, reads tokens from localStorage and validates.
 * Stores: accessToken, refreshToken, role, userId.
 * The actual refresh loop lives in apiClient.ts to handle mid-flight 401s.
 *
 * Per wiring doc §2.1 role routing:
 *   RESIDENT    → /resident
 *   VENDOR      → /vendor
 *   SUPER_ADMIN → /admin
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { saveTokens, clearTokens } from "@/lib/apiClient";
import type { UserRole } from "@/lib/types";

// ── Public routes that don't need auth ───────────────────────────────────────
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

// ── Context types ─────────────────────────────────────────────────────────────

interface AuthContextType {
  token: string | null;
  role: UserRole | null;
  userId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  /** Called after a successful POST /auth/login or POST /auth/register response */
  login: (accessToken: string, refreshToken: string, role: UserRole, userId: string) => void;
  /** Clears all tokens and redirects to /login */
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  role: null,
  userId: null,
  isAuthenticated: false,
  loading: true,
  login: () => {},
  logout: () => {},
});

// ── Role → path mapping ────────────────────────────────────────────────────────

function roleHomePath(role: UserRole): string {
  if (role === "RESIDENT") return "/resident";
  if (role === "VENDOR") return "/vendor";
  if (role === "SUPER_ADMIN") return "/admin";
  return "/login";
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Hydrate state from localStorage on first render
  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken");
    const savedRole = localStorage.getItem("userRole") as UserRole | null;
    const savedUserId = localStorage.getItem("userId");

    if (savedToken && savedRole) {
      setToken(savedToken);
      setRole(savedRole);
      setUserId(savedUserId);

      // Auto‐redirect from root or public paths if already logged in
      if (pathname === "/" || PUBLIC_PATHS.includes(pathname)) {
        router.replace(roleHomePath(savedRole));
      }
    } else {
      // Not authenticated — redirect to login unless on a public path
      if (!PUBLIC_PATHS.includes(pathname)) {
        router.push("/login");
      }
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Save tokens and update context after a successful auth response. */
  const login = useCallback(
    (accessToken: string, refreshToken: string, newRole: UserRole, newUserId: string) => {
      saveTokens(accessToken, refreshToken);
      localStorage.setItem("userRole", newRole);
      localStorage.setItem("userId", newUserId);
      setToken(accessToken);
      setRole(newRole);
      setUserId(newUserId);
      router.push(roleHomePath(newRole));
    },
    [router]
  );

  /** Clear session and go to login. */
  const logout = useCallback(() => {
    clearTokens();
    setToken(null);
    setRole(null);
    setUserId(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        userId,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
