

# Fix: Admin User & Family Deletion Failures

## Root Cause Analysis

Two distinct bugs prevent admin deletion operations:

### Bug 1: User Deletion (UserDeleteDialog.tsx)
The dialog deletes `user_roles`, `family_members`, and `profiles` via the **client SDK** (anon key + RLS), but:
- **Never deletes the `auth.users` record** -- the client SDK cannot call `auth.admin.deleteUser()`. The user remains in the auth system even after profile data is removed.
- Any RLS failure on one step throws and aborts remaining cleanup.

### Bug 2: Family Deletion (FamilyDeleteDialog.tsx -- non-test families)
For regular (non-test) families, the dialog attempts a direct client-side delete on the `families` table. This fails because:
- **26 foreign key constraints** reference the `families` table
- One FK (`family_content_access`) uses `NO ACTION`, which **blocks deletion** entirely
- Even with CASCADE FKs, RLS policies on child tables may prevent cascade operations when using the anon-key client

Test family deletion works correctly because it calls the `delete-family-comprehensive` edge function, which uses a **service role client** (bypasses RLS and handles all dependent records).

---

## Fix Strategy

Route both delete operations through edge functions using the service role client, matching the pattern already established by `delete-family-comprehensive`.

### Change 1: Create `admin-delete-user` Edge Function

New edge function: `supabase/functions/admin-delete-user/index.ts`

- Validates admin JWT (using existing `validateAdminJWT` from `_shared/auth-validator.ts`)
- Applies rate limiting (using existing `cleanupLimiter`)
- Uses service role client to:
  1. Delete from `user_roles`
  2. Delete from `family_members`
  3. Delete from `child_accounts`
  4. Delete from `profiles`
  5. Call `auth.admin.deleteUser()` to remove the auth record
- Logs to `admin_audit_logs`
- Returns structured response with deletion counts

### Change 2: Update `UserDeleteDialog.tsx`

Replace the 3 client-side delete calls with a single edge function invocation:

```typescript
const { data, error } = await supabase.functions.invoke('admin-delete-user', {
  body: { userId: user.id, userEmail: user.email }
});
```

### Change 3: Update `FamilyDeleteDialog.tsx`

Remove the conditional path. Use `delete-family-comprehensive` for **all** families (not just test families). The edge function already handles the complete cascade correctly.

The only difference: for non-test families, skip the `auth.admin.deleteUser()` step (preserve user accounts). This requires a small parameter addition to the edge function.

### Change 4: Update `delete-family-comprehensive` Edge Function

Add an optional `preserveUserAccounts` parameter:

```typescript
interface DeleteFamilyRequest {
  familyId: string;
  preserveUserAccounts?: boolean; // true for regular families
}
```

When `preserveUserAccounts` is true, skip the auth user deletion loop but still clean up all family data and member relationships.

### Change 5: Register new function in `supabase/config.toml`

```toml
[functions.admin-delete-user]
# Admin only - uses validateAdminJWT in code
verify_jwt = true
```

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/admin-delete-user/index.ts` | **New** -- edge function for user deletion |
| `supabase/config.toml` | Add `admin-delete-user` entry |
| `src/components/admin/UserDeleteDialog.tsx` | Replace client-side deletes with edge function call |
| `src/components/admin/FamilyDeleteDialog.tsx` | Use edge function for all families, not just test |
| `supabase/functions/delete-family-comprehensive/index.ts` | Add `preserveUserAccounts` parameter |

---

## Technical Details

### `admin-delete-user` Edge Function Structure

```text
1. CORS preflight handling
2. Rate limiting (cleanupLimiter)
3. Admin JWT validation (validateAdminJWT)
4. Service client operations:
   a. Delete user_roles WHERE user_id = target
   b. Delete family_members WHERE user_id = target
   c. Delete child_accounts WHERE user_id = target
   d. Delete profiles WHERE user_id = target
   e. auth.admin.deleteUser(targetUserId)
5. Audit log entry
6. Return { success, deletedRecords }
```

### `delete-family-comprehensive` Update

```text
Current flow:
  1. Get member user IDs
  2. Delete family_members
  3. Delete child_accounts
  4. Delete family (cascades to 24 other tables)
  5. Delete user_roles for all members
  6. Delete auth users for all members  <-- skip when preserveUserAccounts=true

Updated flow:
  Same as above, but step 6 is conditional on !preserveUserAccounts
```

### `FamilyDeleteDialog.tsx` Update

```text
Current:
  if (isTestFamily) -> edge function
  else -> client-side delete (BROKEN)

Updated:
  Always -> edge function with preserveUserAccounts=!isTestFamily
```

---

## Risk Assessment

- **Low risk**: Follows existing patterns (same auth, rate limiting, service client approach as `delete-family-comprehensive`)
- **No database migrations needed**: All tables and policies already exist
- **Backward compatible**: `preserveUserAccounts` defaults to `false`, preserving existing test-family behavior

