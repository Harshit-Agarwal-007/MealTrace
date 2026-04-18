/**
 * MealTrace shared TypeScript types — derived from backend Pydantic models.
 * Match exactly the JSON shapes documented in MealTrace_Tier1_Frontend_Backend_Wiring.md.
 */

// ── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = "RESIDENT" | "VENDOR" | "SUPER_ADMIN";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  role: UserRole;
  user_id: string;
}

export interface AuthStatusResponse {
  status: string;
  message: string;
}

// ── Resident ─────────────────────────────────────────────────────────────────

export interface ResidentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  room_number: string;
  site_id: string;
  status: "ACTIVE" | "INACTIVE";
  dietary_preference: string;
  balance?: number;
  plan_id?: string;
  allowed_meals?: string[];
}

export interface ResidentBalance {
  resident_id?: string;
  balance: number;
  active_plan?: string;
  plan_expiry?: string;
}

export interface SubscriptionInfo {
  resident_id?: string;
  plan_id?: string;
  plan_name?: string;
  meals_per_day?: number;
  allowed_meals?: string[];
  balance: number;
  status?: "NONE" | "ACTIVE" | "EXPIRED";
  plan_started_at?: string;
  plan_expiry?: string;
}

export interface Transaction {
  id: string;
  timestamp: string;
  meal_type: string;
  site_id?: string;
  site_name?: string;
  status: "SUCCESS" | "BLOCKED";
  block_reason?: string;
  balance_after?: number;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface QRCodeResponse {
  resident_id?: string;
  qr_base64: string;
  payload_signature?: string;
  generated_at: string;
}

export interface GuestPassInfo {
  id: string;
  site_id: string;
  meal_type: string;
  qr_base64?: string;
  status: "UNUSED" | "USED";
  created_at: string;
  expiry_at?: string;
  used_at?: string;
}

// ── Vendor ───────────────────────────────────────────────────────────────────

export interface VendorProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  assigned_site_ids: string[];
  status: string;
}

export interface SiteInfo {
  id: string;
  name: string;
  is_active: boolean;
  meal_windows?: Record<string, { start: string; end: string }>;
  vendor_staff_ids?: string[];
}

export interface SearchResult {
  id: string;
  name: string;
  phone?: string;
  room_number?: string;
  dietary_preference?: string;
  balance?: number;
  plan_name?: string;
}

// ── Scan ─────────────────────────────────────────────────────────────────────

export interface ScanValidateResponse {
  status: "SUCCESS" | "BLOCKED";
  resident_name?: string;
  meal_type?: string;
  balance_after?: number;
  block_reason?: string;
  dietary_preference?: string;
}

// ── Payments ─────────────────────────────────────────────────────────────────

export interface PlanInfo {
  id: string;
  name: string;
  meals_per_day: number;
  meal_count: number;
  duration_days: number;
  price: number;
  description?: string;
  is_active?: boolean;
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  resident_id: string;
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

export interface DashboardStats {
  total_residents: number;
  active_residents: number;
  total_vendors: number;
  active_vendors: number;
  today_total_scans: number;
  today_successful_scans: number;
  today_blocked_scans: number;
  today_guest_pass_scans: number;
  meal_counts: Record<string, number>;
  total_sites: number;
}

export interface ScanFeedEntry {
  id: string;
  resident_id?: string;
  resident_name?: string;
  site_id?: string;
  meal_type?: string;
  status: "SUCCESS" | "BLOCKED";
  block_reason?: string;
  is_guest_pass: boolean;
  timestamp: string;
}
