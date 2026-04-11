/**
 * MealTrace API Client
 *
 * A centralized fetch wrapper that:
 * 1. Prepends NEXT_PUBLIC_API_URL to every path
 * 2. Injects `Authorization: Bearer <token>` header automatically (wiring doc §1.2)
 * 3. Handles 401 → auto-refresh via POST /auth/refresh-token → retries original request
 * 4. Handles binary responses (Excel reports — wiring doc §5.6) via blob download
 *
 * Usage:
 *   import { api } from "@/lib/apiClient";
 *   const data = await api.get("/resident/profile");
 *   const data = await api.post("/scan/validate", { qr_payload, site_id, vendor_id });
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Token helpers ────────────────────────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

function clearTokens(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userRole");
  localStorage.removeItem("userId");
}

// ── Refresh logic ────────────────────────────────────────────────────────────

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

async function attemptTokenRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const res = await fetch(`${BASE_URL}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    // Redirect to login — safe to do client-side only
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  const data = await res.json();
  saveTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

// ── Core request ─────────────────────────────────────────────────────────────

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  headers?: Record<string, string>;
  /**
   * Set to true for Excel report downloads (wiring doc §5.6).
   * Returns a Blob instead of parsed JSON.
   */
  returnBlob?: boolean;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers: extraHeaders = {}, returnBlob = false } = opts;

  const buildHeaders = (token: string | null): Record<string, string> => ({
    ...(body && !(body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  });

  const buildBody = (): string | FormData | undefined => {
    if (!body) return undefined;
    if (body instanceof FormData) return body;
    return JSON.stringify(body);
  };

  const doFetch = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: buildHeaders(token),
      body: buildBody(),
    });

  let token = getAccessToken();
  let res = await doFetch(token);

  // ── 401 handling: queue-based token refresh to prevent race conditions ────
  if (res.status === 401 && !path.startsWith("/auth/")) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newToken = await attemptTokenRefresh();
        token = newToken;
        pendingQueue.forEach((p) => p.resolve(newToken));
      } catch (err) {
        pendingQueue.forEach((p) => p.reject(err));
        throw err;
      } finally {
        pendingQueue = [];
        isRefreshing = false;
      }
    } else {
      // Queue this request until the in-flight refresh completes
      token = await new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      });
    }
    // Retry original request with the new token
    res = await doFetch(token);
  }

  // ── Error handling ────────────────────────────────────────────────────────
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      detail = errBody.detail ?? errBody.message ?? detail;
    } catch {
      // ignore JSON parse errors on error responses
    }
    throw new Error(detail);
  }

  // ── Response parsing ──────────────────────────────────────────────────────
  if (returnBlob) return res.blob() as unknown as T;
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Blob download helper (for Excel reports) ──────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Public API surface ────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),

  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),

  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),

  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),

  /** Download an Excel report (wiring doc §5.6) */
  downloadReport: (path: string, filename: string) =>
    request<Blob>(path, { method: "GET", returnBlob: true }).then((blob) =>
      downloadBlob(blob, filename)
    ),
};

export { saveTokens, clearTokens };
