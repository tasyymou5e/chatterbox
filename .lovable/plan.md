

# Fix: Data Integrity Edge Function Failures

## Root Cause

Two column-name mismatches in `family-integrity-check/index.ts` cause the edge function to fail against the actual database schema.

### Bug 1: Check 1 (Orphaned Child Accounts) -- Lines 227-233

The query joins `profiles!inner(email)`, but the `profiles` table has **no `email` column**. Its columns are: `id`, `user_id`, `first_name`, `last_name`, `created_at`, `updated_at`.

This `!inner` join with a non-existent column causes a PostgREST error, which either crashes the entire check or silently fails depending on error handling.

### Bug 2: Check 6 (Missing Parent Link) -- Lines 419-421

The query uses `select('id, family_name')` on the `families` table, but the column is named `name`, not `family_name`. Line 447 then references `family.family_name` which would be `undefined`.

---

## Fix

### File: `supabase/functions/family-integrity-check/index.ts`

**Change 1 (Lines 227-233):** Remove the `profiles!inner(email)` join. The email is not needed for orphan detection -- the check only needs `id`, `user_id`, `family_id`, `display_name`. If email context is desired for metadata, fetch it from `auth.admin.getUserById()` (already used in Check 8).

```
Before:
  .select(`id, user_id, family_id, display_name, profiles!inner(email)`)

After:
  .select('id, user_id, family_id, display_name')
```

Also update line 255 to remove the `email: ca.profiles?.email` metadata reference.

**Change 2 (Lines 419-421, 447):** Fix the column name from `family_name` to `name`.

```
Before:
  .select('id, family_name')
  ...
  description: `Family "${family.family_name}" has ...`

After:
  .select('id, name')
  ...
  description: `Family "${family.name}" has ...`
```

Also update line 449 metadata from `family_name: family.family_name` to `family_name: family.name`.

---

## Files Modified

| File | Lines | Change |
|------|-------|--------|
| `supabase/functions/family-integrity-check/index.ts` | 228 | Remove `profiles!inner(email)` join |
| `supabase/functions/family-integrity-check/index.ts` | 255 | Remove `email: ca.profiles?.email` |
| `supabase/functions/family-integrity-check/index.ts` | 421 | Change `family_name` to `name` |
| `supabase/functions/family-integrity-check/index.ts` | 447 | Change `family.family_name` to `family.name` |
| `supabase/functions/family-integrity-check/index.ts` | 449 | Change `family_name: family.family_name` to `family_name: family.name` |

No database migrations or new files required. Only the edge function code needs correcting.

