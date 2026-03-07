

## Fix Family Signup and Email Verification

### Root Causes Identified

**1. Signup 500 Error: "Database error saving new user"**

There are two triggers on `auth.users` that fire AFTER INSERT:
- `on_auth_user_created` → calls `handle_new_user()` (creates profile)
- `on_auth_user_activity` → calls `log_auth_event()` (inserts into `user_activity_logs`)

The `user_activity_logs` table has a foreign key `user_activity_logs_user_id_fkey` referencing `profiles(user_id)`. When `log_auth_event` fires before `handle_new_user`, it tries to insert a log row before the profile exists, violating the FK constraint and aborting the entire signup transaction.

**2. Email Verification Failure: "550 domain not verified"**

The Supabase SMTP configuration has an API key associated with an unverified domain. Verification emails cannot be sent until this is resolved.

### Plan

**Step 1: Fix the trigger ordering / FK issue (database migration)**

Drop the `on_auth_user_activity` trigger entirely. The signup activity logging is redundant — `handle_new_user` already creates the profile, and the application layer (`authActionsStore.ts`) already logs signup activity via `authLoggingService.logActivity()`. Removing this trigger eliminates the FK race condition.

```sql
DROP TRIGGER IF EXISTS on_auth_user_activity ON auth.users;
DROP FUNCTION IF EXISTS log_auth_event();
```

**Step 2: Fix email domain verification**

The auth logs show: `"550 The associated domain with your API key is not verified"`. This is a Supabase dashboard configuration issue — the SMTP provider's API key needs to be associated with a verified domain. You'll need to either:
- Verify your sender domain in the Supabase Dashboard → Authentication → Email Templates → SMTP settings
- Or set up a custom email domain through Lovable's email setup

### Additional Issue Found

The `site_settings` table is returning empty results (`[]`), which means `parent_signup_enabled` defaults to whatever the `useSiteSettings` hook returns. This may cause the signup form to appear disabled. Will check if this needs a seed insert.

