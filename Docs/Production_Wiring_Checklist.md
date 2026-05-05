# Production API & Auth Wiring Checklist

Currently, the MealTrace MVP frontend is running in a "UI Mock" environment so that you can freely navigate between the Resident, Vendor, and Admin flows without needing a live, provisioned Python backend. 

Before deploying this to production and connecting it definitively to your `app/routes/` backend, **you must revert or replace the following mocked blocks of code**.

## 1. Login Page (`frontend/src/app/login/page.tsx`)
Currently, the login page fakes the backend token exchange to keep the UI unblocked.

- **[ ] Remove the Role Override Select**: Delete the `<select>` dropdown labeled "Login As (Demo)". In production, you do not let the user pick their role; the role is inherently validated by the backend.
- **[ ] Connect Firebase to Backend**: Inside `handleLogin()`:
  - **Remove**: `const mockBackendToken = "eyMockToken123456789";`
  - **Uncomment/Add**: `const idToken = await userCredential.user.getIdToken();`
  - **Implement**: Make an explicit `POST` request to your Python backend using `fetch` or `axios`: `POST /api/v1/auth/login` passing the `idToken` in the body.
  - **Extract**: Extract the resulting `access_token` and `role` from the Python response JSON, and pass *those* into the `login(token, role)` context function.

## 2. Global Auth Context (`frontend/src/context/AuthContext.tsx`)
- **[ ] HTTP Interceptors**: The `AuthContext` successfully writes the token to `localStorage`, but you need to wire it into your HTTP client so that every request inherently passes it.
  - If using Axios: Add an interceptor inside the `login` function or globally that sets `axios.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;`.

## 3. Registration / Signup (`frontend/src/app/register/page.tsx`)
- **[ ] Provisioning Sync**: Currently, Firebase Auth might just create a user without syncing them to your PostgreSQL Database. 
  - **Modify**: Update the Register submission to invoke `POST /api/v1/auth/register` (or whatever your specific route is) so the Python backend generates the corresponding `Resident` or `Vendor` SQL row after Firebase user creation.

## 4. Razorpay Mock Webhook (`frontend/src/app/resident/plans/page.tsx`)
- **[ ] Real Razorpay Order ID**: The Razorpay instances in `/plans` and `/guest-pass` are using the dummy key `rzp_test_mockKey123`.
  - **Modify**: Before deploying the `Razorpay(options)` instance, you must make a `POST /payments/create-order` call to your backend to generate a cryptographically valid `order_id` and inject it into the `options` object so Razorpay accepts real transaction processing.

## 5. Manual Vendor Simulation (`frontend/src/app/vendor/manual/page.tsx`)
- **[ ] Remove hardcoded Search Array**: The debounced 3-character search autocomplete is currently filtering an array of 2 hardcoded mock residents (Harshit and Harsh).
  - **Modify**: Inside the `useEffect` timeout, replace the array filter with an actual `fetch("/api/v1/vendor/search-user?query=" + query)` to your Python route constraint.
