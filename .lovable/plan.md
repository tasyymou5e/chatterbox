

# Add Quota Indicator to AI Chat Widget

## Changes

### 1. `src/hooks/useAIChat.ts`
- Add `quotaRemaining` and `quotaLimit` state (both `number | null`, default `null`)
- Update `sendMessage` to parse `X-Quota-Remaining` and `X-Quota-Limit` headers after successful response and store them in state
- On 429 error, set `quotaRemaining` to `0` and `quotaLimit` from error response
- Add a `fetchQuota` function that calls the edge function with a lightweight request (or add a dedicated quota-check endpoint)
- Export `quotaRemaining` and `quotaLimit` from the hook

**Simpler approach:** Since headers are already returned, just track them in state after each `sendMessage`. For initial load, add a new edge function endpoint `GET /ai-chat?action=quota` that returns the user's current usage without sending a message.

### 2. `supabase/functions/ai-chat/index.ts`
- Handle `GET` requests: perform only the quota lookup logic (role lookup, count today's messages) and return `{ remaining, limit, role }` as JSON
- No AI call needed for GET -- just quota info

### 3. `src/hooks/useAIChat.ts`
- Add `fetchQuota` callback that does `GET` to the chat URL, parses response, sets `quotaRemaining`/`quotaLimit`
- Call `fetchQuota` on mount and after each `sendMessage`

### 4. `src/components/ai/AIAssistantChat.tsx`
- Import `Progress` component and `quotaRemaining`/`quotaLimit` from hook
- Add a small quota bar above the input area showing "X/Y messages remaining today"
- Color-code: green (>50%), yellow (25-50%), red (<25%), with "Unlimited" label when limit is -1
- When quota is 0, disable the input and show "Daily limit reached"

## Files

| File | Action |
|---|---|
| `supabase/functions/ai-chat/index.ts` | **Modify** -- add GET handler for quota check |
| `src/hooks/useAIChat.ts` | **Modify** -- add quota state + fetchQuota |
| `src/components/ai/AIAssistantChat.tsx` | **Modify** -- render quota indicator |

