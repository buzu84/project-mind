# Auth Flow

How authentication and session management work in ProductMind.

---

## Architecture

- **Provider:** Supabase Auth (hosted, email/password)
- **Session storage:** HTTP-only cookies managed by `@supabase/ssr`
- **Server-side access:** `getCurrentUser()` from `src/lib/auth/server.ts`
- **Client-side access:** `supabase.auth.getUser()` via browser client from `src/lib/supabase/client.ts`
- **No JWT in headers.** No Bearer tokens. No API keys for users.

---

## Client Libraries

| File | Purpose | When to use |
|---|---|---|
| `src/lib/supabase/server.ts` | Server-side client (reads cookies); also provides service-role client for admin operations | API routes, server components, server actions |
| `src/lib/supabase/client.ts` | Browser-side client | Client components (auth forms, auth state sync) |
| `src/lib/auth/server.ts` | `getCurrentUser()` / `requireCurrentUser()` | All API routes and server components |

---

## User Registration

1. User submits email + password + name on `/sign-up`
2. Client calls `supabase.auth.signUp()` with `data: { full_name }`
3. Supabase sends a confirmation email with a link to `/auth/callback?token_hash=...&type=signup`
4. User clicks link → `/auth/callback` route verifies the OTP
5. If session is created → redirect to `/dashboard`
6. If no session but verified → redirect to `/sign-in?confirmed=true`

---

## Sign In

1. User submits email + password on `/sign-in`
2. Client calls `supabase.auth.signInWithPassword()`
3. On success → `router.push("/dashboard")`
4. On "Email not confirmed" error → show resend confirmation option

---

## Password Reset

1. User requests reset on `/forgot-password`
2. Client calls `supabase.auth.resetPasswordForEmail()` with redirect to `/auth/callback`
3. Email link hits `/auth/callback?token_hash=...&type=recovery`
4. Callback verifies OTP → redirects to `/reset-password`
5. User sets new password via `supabase.auth.updateUser({ password })`

---

## Auth Callback (`/app/auth/callback/route.ts`)

Central redirect handler for all Supabase auth flows:

| Parameter | Flow | Action |
|---|---|---|
| `code` | PKCE / OAuth | Exchange code for session → redirect to `next` param or `/dashboard` |
| `token_hash` + `type=signup` | Email confirmation | Verify OTP → redirect to dashboard or sign-in |
| `token_hash` + `type=recovery` | Password reset | Verify OTP → redirect to `/reset-password` |
| `error` | Any failed flow | Redirect to `/sign-in?error=auth_callback_error` |

All redirects use `getSiteUrl()` from `src/lib/url.ts` to ensure they go to the correct origin (never `localhost` in production).

---

## Sign Out

Client calls `supabase.auth.signOut()` → cookies are cleared → redirect to `/`.

---

## Development Mock Auth

When `USE_MOCK_AUTH=true`:
- `getCurrentUser()` returns `DEV_USER` (hardcoded in `src/lib/auth/constants.ts`) without any Supabase call
- No session cookie is needed
- All API routes work without a running Supabase instance
- **Never enabled in production** — `isDevMode()` checks `NODE_ENV !== "production"` AND `USE_MOCK_AUTH === "true"`

---

## Account Deletion

`POST /api/account/delete`:
1. Authenticate via session cookie (server client)
2. Get all user's project IDs
3. Delete all child records across ~15 tables in dependency order (using admin/service-role client to bypass RLS)
4. Delete projects
5. Delete user-level records (ai_usage, global_chat_messages)
6. Call `auth.admin.deleteUser(userId)` to remove the auth account
7. Return `{ success: true }`

Requires `SUPABASE_SERVICE_ROLE_KEY` env var.

---

## Security Notes

- Session JWTs are validated server-side on every API request via `supabase.auth.getUser()` (not just decoded — actually verified with Supabase)
- RLS policies enforce data isolation at the database level as a second layer
- Application code adds a third layer with explicit `user_id` filters on every query
- The `ADMIN_EMAILS` env var is server-only and only used for rate limit bypass

