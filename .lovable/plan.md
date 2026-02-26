

# Add AI Usage Quotas Per User Role

## Overview

Create a configurable quota system that limits daily AI messages per role (parent, child, admin). Admins configure limits in the admin portal; the `ai-chat` edge function enforces them by counting today's messages in `ai_messages`.

## Database

### New table: `ai_usage_quotas`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Default `gen_random_uuid()` |
| `role` | app_role NOT NULL | `admin`, `parent`, `child` (uses existing enum -- need to check if `parent`/`child` exist in enum) |
| `daily_message_limit` | integer NOT NULL | Default: admin=unlimited(-1), parent=50, child=20 |
| `enabled` | boolean NOT NULL | Default `true` |
| `updated_at` | timestamptz | Default `now()` |

Unique constraint on `role`. RLS: admin-only write, authenticated read.

Since the existing `app_role` enum only has `admin`, `moderator`, `user`, we need to either:
- Add `parent` and `child` to the enum, or
- Use a `text` column for role instead

Using `text` is safer to avoid enum migration issues and aligns with how `user_roles.role` might store values.

**Decision:** Use `text` for the role column with a CHECK constraint for valid values.

### Seed data (via insert tool after migration)

| role | daily_message_limit | enabled |
|---|---|---|
| `admin` | -1 (unlimited) | true |
| `parent` | 50 | true |
| `child` | 20 | true |

## Edge Function: `ai-chat/index.ts`

Add quota enforcement after JWT validation, before calling the AI API:

1. Look up user's role from `user_roles` table
2. Query `ai_usage_quotas` for that role's `daily_message_limit`
3. Count today's messages by this user in `ai_messages` (role = 'user')
4. If count >= limit and limit != -1, return 429 with `{ error: "Daily AI quota exceeded", remaining: 0, limit: N }`
5. Include `X-Quota-Remaining` and `X-Quota-Limit` headers in successful responses

## Admin UI: `AdminAIQuotaSettings.tsx`

New component on the Admin AI Settings page:

- Table showing each role with its daily limit and enabled toggle
- Editable numeric input for limits (-1 = unlimited)
- Current usage stats per role (count of today's messages grouped by role)
- Save button to persist changes

```text
┌──────────────────────────────────────────┐
│ 📊 AI Usage Quotas                       │
├──────────────────────────────────────────┤
│ Role     │ Daily Limit │ Used Today │ On │
│──────────│─────────────│────────────│────│
│ Admin    │ Unlimited   │ 12         │ ✓  │
│ Parent   │ 50          │ 23         │ ✓  │
│ Child    │ 20          │ 8          │ ✓  │
│                                          │
│                          [Save Changes]  │
└──────────────────────────────────────────┘
```

## Frontend: `useAIChat.ts`

- Parse `X-Quota-Remaining` header from responses
- Show toast warning when remaining < 5
- Show quota exceeded error with friendly message when 429 received

## Files

| File | Action |
|---|---|
| Migration SQL | **Create** -- `ai_usage_quotas` table + RLS |
| Seed data | **Insert** -- 3 default quota rows |
| `supabase/functions/ai-chat/index.ts` | **Modify** -- add quota check |
| `src/components/admin/AdminAIQuotaSettings.tsx` | **Create** |
| `src/components/admin/AdminAISettings.tsx` | **Modify** -- import and render quota settings |
| `src/hooks/useAIChat.ts` | **Modify** -- handle quota headers/errors |

