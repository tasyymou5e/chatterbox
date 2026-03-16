

## Web Interface Guidelines Compliance Fixes

Five changes across the codebase to address the audit findings.

---

### 1. Skip-to-Content Link

Add a visually-hidden skip link in `src/App.tsx` (or the root layout) that becomes visible on focus, linking to `#main-content`. Add `id="main-content"` to the main content area in `Index.tsx` and other page layouts.

**Files**: `src/App.tsx`, `src/index.css` (skip-link styles), `src/pages/Index.tsx`

---

### 2. Icon-Only Button `aria-label`s

| File | Line | Fix |
|------|------|-----|
| `src/components/SiteHeader.tsx` | ~216 | Add `aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}` to mobile toggle |
| `src/pages/Index.tsx` | ~27 | Add `aria-label="Scroll to get started"` to ArrowDown button |

Audit all other icon-only buttons found across games, admin, etc. and add labels.

---

### 3. Autocomplete Attributes on Auth Inputs

| File | Input | `autoComplete` value |
|------|-------|---------------------|
| `SignInForm.tsx` | email | `email` |
| `SignInForm.tsx` | password | `current-password` |
| `SignUpForm.tsx` | first name | `given-name` |
| `SignUpForm.tsx` | last name | `family-name` |
| `SignUpForm.tsx` | email | `email` |
| `SignUpForm.tsx` | password | `new-password` |
| `ChildSignupForm.tsx` | password | `new-password` |
| `ChildSignupForm.tsx` | confirm | `new-password` |
| `ResetPasswordConfirmForm.tsx` | new pw | `new-password` |
| `ResetPasswordConfirmForm.tsx` | confirm | `new-password` |
| `AdminLogin.tsx` | password | `current-password` |
| `AdminBootstrap.tsx` | password | `new-password` |
| `ResetPasswordConfirm.tsx` | both | `new-password` |

Also add `spellCheck={false}` to all email inputs.

---

### 4. Replace `transition-all` with Explicit Properties

**39 files** use `transition-all`. Replace each with the specific properties being transitioned:

- **Most common pattern**: `transition-all duration-300` on hover cards → `transition-[transform,box-shadow,border-color] duration-300`
- **Progress bars**: `transition-all` → `transition-[width] duration-300` or keep `transform` where translateX is used
- **Color-only transitions**: → `transition-colors duration-200`
- **Scale + shadow**: → `transition-[transform,box-shadow] duration-300`
- **Global rule in `src/index.css:164`**: `transition: all 0.2s` on buttons → `transition: background-color 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s`

Key files (non-exhaustive): `accordion.tsx`, `tabs.tsx`, `PortalSelection.tsx`, `KidsContentCard.tsx`, `ContentCard.tsx`, `GameCard.tsx`, `ChoreCompletionDialog.tsx`, `DailyPlanWidget.tsx`, `AudioPlayer.tsx`, `HealthScoreGauge.tsx`, `AdminSidebar.tsx`, etc.

---

### 5. Prefers-Reduced-Motion Support

`src/index.css` already has a global `prefers-reduced-motion: reduce` rule (lines 168-174) that sets `animation-duration` and `transition-duration` to near-zero. This provides baseline coverage.

Additional refinements:
- In `tailwind.config.ts`, verify the `motion-reduce:` variant is available (Tailwind v3 includes it by default)
- For Framer Motion animations (per project memory), verify the existing `useAnimationSafe` hook is used consistently — audit key animation files and add it where missing
- Add `motion-reduce:transition-none` or `motion-reduce:hover:scale-100` to prominent hover-scale effects (e.g., `PortalSelection.tsx`, `KidsContentCard.tsx`, `SubtractionGame.tsx` already has it)

---

### Summary of File Touches

| Category | Files affected |
|----------|---------------|
| Skip link | 3 files (App.tsx, index.css, Index.tsx) |
| aria-labels | ~2-5 files |
| autocomplete | ~7 auth form files |
| transition-all | ~39 files |
| reduced-motion | ~5-10 files with hover:scale |

Total: ~50-55 file edits. The `transition-all` replacements are the bulk — each is a targeted className string replacement.

