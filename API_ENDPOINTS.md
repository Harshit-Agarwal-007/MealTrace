# MealTrace API Endpoints

This file serves as the singular source of truth for all backend API endpoints. Update this file whenever new endpoints are added or modified.

## Admin

### `GET` `/admin/residents`
> **Admin List Residents**
> 
> Paginated resident list with optional filters.

**Parameters**: page (query): integer, page_size (query): integer, status (query): string, site_id (query): string, search (query): string

### `POST` `/admin/residents`
> **Admin Add Resident**
> 
> Add an individual resident.
> Also creates a Firebase Auth account so the user can login.
> If no password provided, sends a password setup email.

**Parameters**: None

### `GET` `/admin/residents/{resident_id}`
> **Admin Get Resident**
> 
> Get a single resident's full profile (for click-through detail view).

**Parameters**: resident_id (path): string

### `PATCH` `/admin/residents/{resident_id}`
> **Admin Edit Resident**
> 
> Edit a resident's profile (partial update).

**Parameters**: resident_id (path): string

### `DELETE` `/admin/residents/{resident_id}`
> **Admin Delete Resident**
> 
> Soft-delete a resident — sets status to INACTIVE and invalidates QR.
> The document is preserved for audit trail.

**Parameters**: resident_id (path): string

### `POST` `/admin/residents/bulk`
> **Admin Bulk Import**
> 
> Bulk import residents from a CSV file.
> Also creates Firebase Auth accounts for each user.

**Parameters**: None

### `GET` `/admin/vendors`
> **Admin List Vendors**
> 
> List vendors with optional search and site filter.

**Parameters**: page (query): integer, page_size (query): integer, search (query): string, site_id (query): string

### `POST` `/admin/vendors`
> **Admin Create Vendor**
> 
> Create a new vendor.
> Creates a Firebase Auth account so the vendor can login.
> Optionally assigns them to sites.

**Parameters**: None

### `GET` `/admin/vendors/{vendor_id}`
> **Admin Get Vendor**
> 
> Get a single vendor's profile.

**Parameters**: vendor_id (path): string

### `PATCH` `/admin/vendors/{vendor_id}`
> **Admin Update Vendor**
> 
> Update a vendor's profile (partial update).

**Parameters**: vendor_id (path): string

### `DELETE` `/admin/vendors/{vendor_id}`
> **Admin Delete Vendor**
> 
> Soft-delete a vendor — sets status to INACTIVE.
> Removes vendor from all assigned sites.

**Parameters**: vendor_id (path): string

### `GET` `/admin/sites/{site_id}/residents`
> **Admin Site Residents**
> 
> Get all residents assigned to a specific site.

**Parameters**: site_id (path): string

### `GET` `/admin/sites/{site_id}/live-scans`
> **Admin Site Live Scans**
> 
> Recent scans at a specific site.
> Shows who has been eating at this site within the last N hours.
> Admin can click on a user to navigate to their CRUD page.

**Parameters**: site_id (path): string, hours (query): integer

### `GET` `/admin/search`
> **Admin Search**
> 
> Unified search across residents, vendors, and sites.
> Returns matching results from each category.

**Parameters**: q (query): string

### `POST` `/admin/credit-override`
> **Admin Credit Override**
> 
> Manually add or deduct credits for a resident.
> 
> - Positive amount = add credits
> - Negative amount = deduct credits
> - Reason is logged for audit trail

**Parameters**: None

### `GET` `/admin/reports/weekly`
> **Admin Weekly Report**
> 
> Download weekly attendance report as Excel file.

**Parameters**: start_date (query): string

### `GET` `/admin/reports/monthly`
> **Admin Monthly Report**
> 
> Download monthly summary report as Excel file.

**Parameters**: year (query): string, month (query): string

### `GET` `/admin/reports/financial`
> **Admin Financial Report**
> 
> Download financial/payment transaction log as Excel file.

**Parameters**: None

### `GET` `/admin/reports/exception`
> **Admin Exception Report**
> 
> Download exception report (blocked scans) as Excel file by date range.

**Parameters**: start_date (query): string, end_date (query): string

### `GET` `/admin/dashboard/stats`
> **Admin Dashboard Stats**
> 
> Live dashboard statistics.
> 
> Returns: total residents, active residents, today's meal counts,
> total revenue, etc.

**Parameters**: None

### `GET` `/admin/dashboard/scan-feed`
> **Admin Scan Feed**
> 
> Recent scan activity feed for the admin live dashboard.
> Returns the latest N scan log entries.

**Parameters**: limit (query): integer

### `GET` `/admin/residents/{resident_id}/transactions`
> **Admin Resident Transactions**
> 
> Get a specific resident's scan/transaction history (admin view).
> Used when admin clicks on a resident to see their activity.

**Parameters**: resident_id (path): string, page (query): integer, page_size (query): integer

### `POST` `/admin/residents/{resident_id}/subscribe`
> **Admin Subscribe Resident**
> 
> Admin subscribes a resident to a meal plan with selected meals.
> 
> Useful when PG owner manages subscriptions on behalf of residents.

**Parameters**: resident_id (path): string

### `GET` `/admin/plans`
> **Admin List Plans**
> 
> List all plans (including inactive ones, unlike the public /plans endpoint).

**Parameters**: None

### `POST` `/admin/plans`
> **Admin Create Plan**
> 
> Create a new meal plan.

**Parameters**: None

### `PATCH` `/admin/plans/{plan_id}`
> **Admin Update Plan**
> 
> Update a meal plan (partial update).

**Parameters**: plan_id (path): string

### `DELETE` `/admin/plans/{plan_id}`
> **Admin Delete Plan**
> 
> Soft-delete a plan — sets is_active to False.
> Does NOT remove the plan (existing subscriptions may reference it).

**Parameters**: plan_id (path): string

### `GET` `/admin/credit-overrides`
> **Admin Credit Overrides Log**
> 
> Audit log of all manual credit overrides.
> Shows who changed what, when, and why.

**Parameters**: resident_id (query): string, page (query): integer, page_size (query): integer

### `POST` `/admin/notifications/broadcast`
> **Admin Broadcast Notification**
> 
> Broadcast a push notification to all residents at a site (or all sites).
> Example: 'Dinner delayed by 30 minutes at North Wing'.

**Parameters**: None

---

## Authentication

### `POST` `/auth/register`
> **Register**
> 
> Self-registration for residents.
> 
> Creates a Firebase Auth account + Firestore resident profile.
> Returns JWT pair so the user is immediately logged in after registration.

**Parameters**: None

### `POST` `/auth/login`
> **Login**
> 
> Authenticate using Firebase ID token.
> 
> The client obtains the Firebase ID token via Firebase Auth SDK
> (email/password or OTP), then sends it here to get our JWT pair.

**Parameters**: None

### `POST` `/auth/refresh-token`
> **Refresh Token**
> 
> Exchange a valid refresh token for a new access + refresh token pair.

**Parameters**: None

### `POST` `/auth/forgot-password`
> **Forgot Password**
> 
> Trigger a Firebase password reset email.
> 
> Always returns success (to prevent email enumeration) but
> only actually sends if the email is registered.

**Parameters**: None

### `POST` `/auth/logout`
> **Logout**
> 
> Logout — server-side this is a no-op for stateless JWTs.
> The client should discard both tokens.

**Parameters**: None

### `POST` `/auth/fcm-token`
> **Update Fcm**
> 
> Update the FCM device token for push notifications.
> Called after login or when the FCM token refreshes.

**Parameters**: None

### `POST` `/auth/change-password`
> **Change Pwd**
> 
> Change password for the currently authenticated user.
> Requires the current password and a new password (min 6 chars).

**Parameters**: None

---

## Development

### `POST` `/dev/login`
> **Dev Login**
> 
> Dev-only login — bypasses Firebase Auth entirely.
> Provide either a user_id or a role to get a JWT.

**Parameters**: None

### `GET` `/dev/users`
> **Dev List Users**
> 
> List all test users available for dev login.

**Parameters**: None

### `GET` `/dev/generate-qr/{resident_id}`
> **Dev Generate Qr**
> 
> Generate a fresh QR code for a resident (for testing scan flow).

**Parameters**: resident_id (path): string

### `GET` `/dev/sites`
> **Dev List Sites**
> 
> List all sites for dev UI dropdowns.

**Parameters**: None

---

## Health

### `GET` `/`
> **Root**
> 
> Health check endpoint.

**Parameters**: None

### `GET` `/health`
> **Health Check**
> 
> Detailed health check with Firebase connectivity.

**Parameters**: None

---

## Payments

### `POST` `/payments/create-order`
> **Create Order**
> 
> Create a Razorpay order for plan purchase or guest pass.
> 
> Returns order details to be used with Razorpay checkout on the client.

**Parameters**: None

### `POST` `/payments/webhook`
> **Razorpay Webhook**
> 
> Razorpay webhook endpoint — called by Razorpay on payment events.
> 
> CRITICAL SECURITY:
> - Validates X-Razorpay-Signature using HMAC-SHA256
> - On valid `payment.captured` event: atomically credits balance
> - On invalid signature: rejects with 400
> 
> This endpoint has NO auth requirement (it's called by Razorpay servers).

**Parameters**: None

### `GET` `/plans`
> **List Plans**
> 
> List all available meal plans.
> 
> Each plan has:
> - meals_per_day: how many meals included (1, 2, or 3)
> - meal_count: total credits in the plan
> - duration_days: validity period
> - price: price in INR

**Parameters**: None

### `POST` `/guest-pass/purchase`
> **Buy Guest Pass**
> 
> Purchase a single-use guest QR pass for ₹100.
> 
> Used when a resident wants a meal outside their plan
> (e.g., they have breakfast+dinner but need lunch today).
> Valid for 24 hours. Can be used for one meal scan.

**Parameters**: None

---

## Resident

### `GET` `/resident/profile`
> **Resident Profile**
> 
> Get the currently authenticated resident's profile.

**Parameters**: None

### `PATCH` `/resident/profile`
> **Resident Self Edit**
> 
> Self-edit profile — residents can update their name, phone, room number.
> Cannot change email, site, status, or plan.

**Parameters**: None

### `GET` `/resident/qr-code`
> **Resident Qr Code**
> 
> Generate a cryptographically signed QR code for the resident.
> 
> Returns base64-encoded PNG image. The QR payload contains:
> - resident_uuid
> - site_id binding
> - timestamp
> - HMAC-SHA256 signature

**Parameters**: None

### `GET` `/resident/balance`
> **Resident Balance**
> 
> Get current credit count and active plan info.

**Parameters**: None

### `GET` `/resident/transactions`
> **Resident Transactions**
> 
> Get paginated scan/transaction history.

**Parameters**: page (query): integer, page_size (query): integer

### `GET` `/resident/subscription`
> **Resident Subscription**
> 
> Get the resident's current subscription details.
> 
> Returns plan info, allowed meals, remaining credits, and status.
> The mobile app uses this to show/lock meal options in the UI.

**Parameters**: None

### `POST` `/resident/subscribe`
> **Resident Subscribe**
> 
> Subscribe to a meal plan with selected meal types.
> 
> Example: Plan "1 Meal/Day", selected_meals: ["BREAKFAST"]
> → Resident can only scan for breakfast. Lunch/dinner require a ₹100 guest pass.
> 
> The number of selected meals must match the plan's meals_per_day.

**Parameters**: None

### `GET` `/resident/guest-passes`
> **Resident Guest Passes**
> 
> List all guest passes for the resident (active + used).
> Ordered by most recent first.

**Parameters**: None

---

## Scanner

### `POST` `/scan/validate`
> **Scan Validate**
> 
> Validate a scanned QR code.
> 
> Runs all 6 hard-block conditions atomically:
> 1. INVALID_QR — Signature verification failed
> 2. INACTIVE_RESIDENT — Resident not active
> 3. WRONG_SITE — QR site ≠ vendor's site
> 4. OUTSIDE_MEAL_WINDOW — Not during meal time
> 5. DUPLICATE_SCAN — Already scanned for this meal today
> 6. ZERO_BALANCE — No credits remaining
> 
> On success: deducts 1 credit atomically and returns SUCCESS.
> 
> Response JSON:
> ```json
> {
>     "status": "SUCCESS" | "BLOCKED",
>     "resident_name": "...",
>     "meal_type": "LUNCH",
>     "balance_after": 29,
>     "block_reason": null | "DUPLICATE_SCAN"
> }
> ```
> 
> Latency target: <2s on 4G.

**Parameters**: None

### `POST` `/scan/manual`
> **Scan Manual**
> 
> Manually log a scan without a physical QR code.
> Used by vendors when resident forgets their phone.
> Requires resident_id, site_id, and an optional description.

**Parameters**: None

---

## Sites

### `GET` `/sites`
> **Get Sites**
> 
> List all PG sites with meal window config.

**Parameters**: None

### `POST` `/sites`
> **Create New Site**
> 
> Create a new PG site with meal window configuration.

**Parameters**: None

### `GET` `/sites/{site_id}`
> **Get Site By Id**
> 
> Get a specific site's details.

**Parameters**: site_id (path): string

### `PATCH` `/sites/{site_id}`
> **Update Existing Site**
> 
> Update site configuration (name, meal windows, vendor staff, active status).

**Parameters**: site_id (path): string

### `DELETE` `/sites/{site_id}`
> **Delete Existing Site**
> 
> Deactivate a site — sets is_active to False.
> Does NOT delete the document (for audit trail and existing references).

**Parameters**: site_id (path): string

---

## Vendor

### `GET` `/vendor/profile`
> **Vendor Profile**
> 
> Get the currently authenticated vendor's profile.
> Used by the scanner app to display vendor info and assigned sites.

**Parameters**: None

### `GET` `/vendor/assigned-sites`
> **Vendor Assigned Sites**
> 
> Get the sites assigned to this vendor.
> Returns full site info including meal windows for the scanner app's site picker.

**Parameters**: None

### `GET` `/vendor/search-user`
> **Vendor Search User**
> 
> Search for a resident by name, phone, or room number.
> Returns basic info (Name, Room, Dietary Pref) to allow the vendor
> to grab the resident's ID and perform a manual log if they forgot their phone.

**Parameters**: query (query): string

---

