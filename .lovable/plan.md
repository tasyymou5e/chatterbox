

# Logging Consolidation: Wide Events & Single Logger

## Current State (Anti-Pattern)

The codebase has **5 separate logging utilities** plus **1,388 raw console calls across 83 files**:

1. `src/utils/logger.ts` — `logger` singleton with buffer (used in 3 files)
2. `src/utils/secureLogging.ts` — `secureLog` with PII redaction (used in ~15 files)
3. `src/utils/debugLogger.ts` — `debugLog` with rate limiting (used in ~5 files)
4. `src/utils/conditionalLogger.ts` — `cLog`/`cError` shorthand (used in 14 files)
5. `src/utils/parentPortalLogger.ts` — domain-specific Supabase query logging (used in 6 files)

This violates every principle in the skill: multiple loggers, scattered logs, unstructured strings, no environment context, no wide events.

## Plan

### Phase 1: Build the Single Logger

Create `src/utils/wideLogger.ts` — one logger to replace all five. Features:
- **Two levels only**: `info` and `error`
- **JSON-structured output** with consistent schema
- **Environment context** auto-included (app version from `package.json`, `NODE_ENV`, user agent, URL)
- **PII sanitization** (carried over from `secureLog`)
- **Rate limiting** (carried over from `debugLog`)
- **Buffer** for the Logs Triage dashboard (carried over from `logger`)
- **Wide event builder**: `createWideEvent()` returns a mutable record that accumulates context, emitted in `finally`

```text
┌─────────────────────────────────────┐
│         wideLogger.ts               │
│                                     │
│  logger.info(event)                 │
│  logger.error(event)                │
│  createWideEvent(base) → WideEvent  │
│  wideEvent.add({ user: {...} })     │
│  wideEvent.emit()  ← finally block │
│                                     │
│  Auto-includes:                     │
│  - timestamp, environment, version  │
│  - request_id (generated UUID)      │
│  - PII sanitization                 │
│  - rate limiting                    │
│  - buffer for Logs Triage dashboard │
└─────────────────────────────────────┘
```

### Phase 2: Edge Function Wide Event Middleware

Create `supabase/functions/_shared/wide-event.ts` — a helper for Deno edge functions:
- Wraps handler in try/catch/finally with timing
- Accumulates context throughout the request
- Emits single JSON log line at completion
- Includes: method, path, request_id, duration_ms, status_code, outcome, user context, environment (Deno version, function name)

Refactor `error-collector/index.ts` as the first edge function to use it (exemplar).

### Phase 3: Migrate Consumers (Batch by Utility)

**Batch A** — Replace `conditionalLogger` imports (14 files):
- `cLog(msg)` → `logger.info({ message, component })`
- `cError(msg)` → `logger.error({ message, component })`

**Batch B** — Replace `secureLog` imports (~15 files):
- `secureLog.dev(msg, data)` → `logger.info({ message, ...data })` (dev-only gate stays in new logger)
- `secureLog.error(msg, err)` → `logger.error({ message, error })`
- `secureLog.warn(msg)` → `logger.info({ message, level_hint: 'warn' })`
- `secureLog.security()` stays as a dedicated method on the new logger (security events need special handling)

**Batch C** — Replace `debugLog` imports (~5 files):
- Same mapping as conditionalLogger

**Batch D** — Replace `parentPortalLogger` imports (6 files):
- `logSupabaseQuery()` → add query context to wide event or `logger.info({ component: 'ParentPortal', query: {...} })`

**Batch E** — Replace `logger` (old) imports (3 files: main.tsx, errorHandling.ts, parentPortalLogger.ts):
- Direct swap to new logger

**Batch F** — Replace raw `console.*` calls in remaining files:
- This is the largest batch (83 files). Prioritize files with 3+ console calls first. Convert each to structured `logger.info/error`.

### Phase 4: Delete Old Utilities

After all consumers migrated:
- Delete `src/utils/logger.ts` (old)
- Delete `src/utils/debugLogger.ts`
- Delete `src/utils/conditionalLogger.ts`
- Delete `src/utils/parentPortalLogger.ts`
- Keep `src/utils/secureLogging.ts` temporarily if `secureLog.security()` callers need gradual migration, otherwise fold into new logger and delete

### Phase 5: Update Logs Triage Dashboard

Update `useLogsTriage.ts` and `ErrorCapture.tsx` to read from the new logger's buffer instead of the old one.

## Files Created

| File | Purpose |
|------|---------|
| `src/utils/wideLogger.ts` | Single structured logger with wide event support |
| `supabase/functions/_shared/wide-event.ts` | Edge function wide event middleware |

## Files Modified

~90+ files across batches A-F (consumer migration). Key files:
- All 14 `conditionalLogger` consumers
- All ~15 `secureLog` consumers  
- All ~5 `debugLog` consumers
- All 6 `parentPortalLogger` consumers
- `error-collector/index.ts` (wide event exemplar)
- `src/hooks/useLogsTriage.ts` (buffer source update)

## Files Deleted

| File | Reason |
|------|--------|
| `src/utils/logger.ts` | Replaced by wideLogger |
| `src/utils/debugLogger.ts` | Replaced by wideLogger |
| `src/utils/conditionalLogger.ts` | Replaced by wideLogger |
| `src/utils/parentPortalLogger.ts` | Replaced by wideLogger |
| `src/utils/secureLogging.ts` | Folded into wideLogger |

## Scope Note

Given the scale (~90 files), I recommend implementing Phases 1-2 first, then migrating consumers in batches. This avoids a single massive change and lets us verify each batch compiles cleanly.

