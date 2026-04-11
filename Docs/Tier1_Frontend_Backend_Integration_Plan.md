# MealTrace Digital — Frontend-Backend Integration Plan & Deep Analysis

**Status:** Planned
**Date:** 2026-04-11

## 1. Deep Analysis

After a detailed cross-examination of `Docs/MealTrace_Tier1_Frontend_Backend_Wiring.md`, the Python backend (`app/routes`), and the Next.js `frontend` directories, here are the findings:

### 1.1 Backend Assessment 
**Status: Highly Ready.**
The backend endpoints are correctly scaffolded and aligned with the API specification. 
- Authentication (`/auth/login`, `/auth/register`, `/auth/refresh-token`) is properly defined.
- Core business logic routes (`/scan/validate`, `/scan/manual`, `/resident/profile`, `/vendor/assigned-sites`, `/admin/dashboard/stats`) are fully present in their respective router files.

### 1.2 Frontend Assessment
**Status: Completely Disconnected.**
The frontend contains mostly UI scaffolding with no actual data-fetching layer:
- **No API Client:** There are no `fetch` or `axios` instances configured to talk to the backend.
- **Mocked Authentication:** `src/app/login/page.tsx` grabs a Firebase token but currently provisions a mock backend token (`eyMockToken123456789`) and uses a hardcoded dropdown for role assignment instead of receiving the authoritative role from the backend.
- **Mocked Context:** `AuthContext.tsx` only works with local storage and doesn't engage in token refreshes or API session synchronization.
- **All Data is Static/Dummy:** The Vendor, Resident, and Super Admin dashboards currently do not query the backend for live data.

### 1.3 Identified Risks and Wiring Hazards
- **The Razorpay Discrepancy:** The design document explicitly mentions a conflict where guest passes do not correctly issue if handled purely via webhook. This must be addressed immediately during the payment wiring phase to prevent the system from getting into corrupt states.
- **Token Expiration (401s):** Without an automated retry loop via the `/auth/refresh-token` endpoint, users will face sudden logouts and poor UX.

---

## 2. Integration Action Plan & Suggestions

To fully connect the backend to the frontend, we must tackle the integration systematically. 

### Phase 1: The Core Foundation (API & Auth)
**Suggestions:** Create a centralized standard for network fetching to prevent spaghetti code.
1. **Establish `src/lib/apiClient.ts`:** A singleton wrapper over `fetch` that automatically injects the `Authorization: Bearer <token>` header into every request.
2. **Add 401 Interceptors:** If an API call fails with 401 Unauthorized, automatically queue the request, hit `POST /auth/refresh-token`, update local storage, and retry the request transparently.
3. **Fix `login/page.tsx` & `AuthContext.tsx`:** Remove the mock roles. Upon Firebase sign-in, post the token to `POST /auth/login`, parse the return details (token pair & real server-side role), and save into the `AuthContext`.

### Phase 2: Actioning Resident & Vendor Dashboards
**Suggestions:** Optimize API pulls by fetching essential data first, then paginated data later.
1. **Resident Wiring:** Wire the Resident Dashboard to hit `GET /resident/profile`, `GET /resident/balance`, and `GET /resident/subscription` in `Promise.all()` to prevent waterfall loading. Wire up the QR code component to securely display `GET /resident/qr-code`.
2. **Vendor Wiring:** Connect vendor dashboard to `GET /vendor/profile` and `GET /vendor/assigned-sites`. Bind the scanner logic directly to `POST /scan/validate` and pass the returned success/block reason back to the UI.

### Phase 3: Actioning Super Admin Metrics
**Suggestions:** Provide a manual refresh toggle for the admin since websockets aren't active in Tier 1.
1. Wire `GET /admin/dashboard/stats` into the KPI cards.
2. Wire `GET /admin/dashboard/scan-feed` into the live feed table and establish an optional `setInterval` polling every 15 seconds.

### Phase 4: Push Notifications & Polish
1. On successful login, check for FCM permission, get the token, and send it to `POST /auth/fcm-token`.
2. Verify all error cases (No connection, Server Error 500) gracefully degenerate with a UI toast rather than crashing the PWA.
