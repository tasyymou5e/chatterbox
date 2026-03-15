

# Configuration Consistency Report

## Files Analyzed
- `.env` (3 keys)
- `.env.test.example` (3 keys)
- `src/vite-env.d.ts` (type declarations)
- `src/integrations/supabase/client.ts` (runtime config)
- `src/utils/wideLogger.ts` (env references)
- `index.html` (CSP config)
- `vite.config.ts` (build + PWA config)
- `src/hooks/useEdgeFunctionHealth.ts`
- `src/components/admin/llm/LLMHealthCheckLogs.tsx`

## Summary
- **Total Issues: 4**
- **Critical: 1** | **Warnings: 3**

---

## Critical Issue

### 1. Hardcoded Supabase URL bypasses env config (2 files)

Two files use hardcoded `https://lxuqfgbukrrickanmmic.supabase.co/functions/v1/...` URLs instead of reading from `import.meta.env.VITE_SUPABASE_URL`:

| File | Line |
|------|------|
| `src/hooks/useEdgeFunctionHealth.ts` | 76 |
| `src/components/admin/llm/LLMHealthCheckLogs.tsx` | 69 |

If the Supabase project ever changes, these would break silently while the rest of the app works. Both should use `` `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/...` `` (matching the pattern already used in `useAIChat.ts` and `AdminAISettings.tsx`).

---

## Warnings

### 2. Undeclared env variable: `VITE_APP_VERSION`

`wideLogger.ts` reads `import.meta.env.VITE_APP_VERSION` but:
- It is **not defined** in `.env`
- It is **not declared** in `src/vite-env.d.ts`
- It always resolves to `'unknown'`

**Resolution**: Either define it in `vite.config.ts` via `define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version) }` to auto-inject from `package.json`, or add it to `.env`. Also add it to `vite-env.d.ts`.

### 3. CSP `connect-src` hardcodes Supabase domain

`index.html` line 21 hardcodes `https://lxuqfgbukrrickanmmic.supabase.co` in the CSP `connect-src` directive. This is unavoidable for a meta tag (can't use env vars in HTML), but is worth documenting as a manual update point if the Supabase project changes. A small comment already exists for `script-src`; add one for `connect-src` too.

### 4. PWA `runtimeCaching` hardcodes Supabase URL patterns

`vite.config.ts` lines 71-97 have four `urlPattern` regexes all hardcoding `lxuqfgbukrrickanmmic`. These could be dynamically constructed from a constant, making future project changes a single edit.

---

## Plan

### Fix 1: Replace hardcoded Supabase URLs in 2 source files
- `useEdgeFunctionHealth.ts` line 76: use `` `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${funcConfig.name}` ``
- `LLMHealthCheckLogs.tsx` line 69: use `` `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scheduled-health-check` ``

### Fix 2: Wire up `VITE_APP_VERSION`
- In `vite.config.ts`, read version from `package.json` and inject via Vite's `define`:
  ```ts
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '0.0.0') }
  ```
- Add `VITE_APP_VERSION` to `src/vite-env.d.ts`

### Fix 3: Extract Supabase project ID as constant in `vite.config.ts`
- Define `const SUPABASE_PROJECT_ID = 'lxuqfgbukrrickanmmic'` at top of config
- Use it to build the 4 `urlPattern` regexes dynamically
- Add comment to `index.html` CSP `connect-src` noting it must be updated if project ID changes

### Files modified
| File | Change |
|------|--------|
| `src/hooks/useEdgeFunctionHealth.ts` | Replace hardcoded URL |
| `src/components/admin/llm/LLMHealthCheckLogs.tsx` | Replace hardcoded URL |
| `vite.config.ts` | Add `VITE_APP_VERSION` define, extract Supabase project constant for PWA regexes |
| `src/vite-env.d.ts` | Declare `VITE_APP_VERSION` |
| `index.html` | Add comment on `connect-src` |

