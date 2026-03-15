

# Frontend Security Hardening — Gap Assessment & Fixes

## Assessment Summary

The codebase already has strong security foundations:
- DOMPurify for sanitization (via `src/lib/utils.ts`)
- CSP meta tag in `index.html`
- `rel="noopener noreferrer"` on all external links
- Origin-validated postMessage in `LessonPlayerWrapper.tsx`
- Zod-based input validation (`enhancedInputValidation.ts`)
- Production security wrapper with HTTPS checks

## Gaps Found

### 1. Weak postMessage origin validation in KidsGameLauncher.tsx (HIGH)
`LessonPlayerWrapper.tsx` uses a strict `ALLOWED_GAME_ORIGINS` allowlist, but `KidsGameLauncher.tsx` uses a loose `.includes()` check (`event.origin.includes('lovable.app')`) which could be spoofed (e.g., `evil-lovable.app`). This should use the same allowlist pattern.

### 2. CSP allows `unsafe-inline` and `unsafe-eval` for scripts (MEDIUM)
`index.html` line 14: `script-src 'self' 'unsafe-inline' 'unsafe-eval'`. This significantly weakens XSS protection. The edge function CSP in `security-headers.ts` correctly omits these, but the client-side meta tag still has them (likely needed for Vite dev/Lovable preview). We should add a comment documenting this is required for the dev environment and note the production deployment should use nonce-based CSP via HTTP headers.

### 3. No global unhandled error/rejection capture for security events (LOW)
The `useErrorCapture` hook exists for the Logs Triage dashboard but isn't wired into the `ProductionSecurityWrapper`. Security-relevant errors (CSP violations, mixed content) should be captured and logged via the wide logger.

### 4. Missing `sandbox` attribute on game iframes (MEDIUM)
Game iframes in `KidsGameLauncher` and `LessonPlayerWrapper` should use the `sandbox` attribute to restrict capabilities (e.g., `sandbox="allow-scripts allow-same-origin"`), limiting what embedded games can do.

## Plan

### Fix 1: Harden KidsGameLauncher postMessage validation
- Import or define `ALLOWED_GAME_ORIGINS` allowlist (same as LessonPlayerWrapper)
- Replace loose `.includes()` check with strict `ALLOWED_GAME_ORIGINS.includes(event.origin)`
- Add security log for rejected origins

**File**: `src/components/kids/KidsGameLauncher.tsx` — update lines 100-104

### Fix 2: Add sandbox attribute to game iframes
- In `KidsGameLauncher.tsx`, add `sandbox="allow-scripts allow-same-origin"` to the iframe element
- In `LessonPlayerWrapper.tsx`, add the same sandbox attribute if not already present

**Files**: `KidsGameLauncher.tsx`, `LessonPlayerWrapper.tsx` — iframe elements

### Fix 3: Wire CSP violation reporting into ProductionSecurityWrapper
- Add `document.addEventListener('securitypolicyviolation', ...)` in ProductionSecurityWrapper
- Log violations via `secureLog.security()` with directive, blocked URI, and source info

**File**: `src/components/security/ProductionSecurityWrapper.tsx` — add useEffect

### Fix 4: Document CSP unsafe-inline requirement
- Add a clear comment in `index.html` explaining `unsafe-inline`/`unsafe-eval` are required for Lovable preview/Vite HMR and should be replaced with nonce-based CSP in production HTTP headers

**File**: `index.html` — comment on line 14

