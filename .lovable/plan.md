

# TECHSTACK.md -- Comprehensive Tech Stack Overview

## Plan

Create a single `TECHSTACK.md` file at the project root that serves as the authoritative reference for every technology used across the Chatterbox application. The file will be organized by layer (frontend, backend, tooling, CI/CD) with version numbers sourced directly from `package.json`, configuration details from actual config files, and cross-references to existing knowledge files for deeper dives.

---

## Document Structure

### 1. Header & Metadata
- Title, last updated date (2026-02-09), purpose statement
- Quick-reference table: category, technology, version, config file

### 2. Frontend Runtime
- **React 18.3.1** -- Component library, StrictMode enabled, JSX transform
- **React DOM 18.3.1** -- DOM renderer
- **React Router DOM 7.12.0** -- Client-side routing with lazy-loaded route groups (core, parent, kids, admin, feature, support, connect, game)
- **TypeScript 5.8.3** -- Strict mode (`noImplicitAny`, `strictNullChecks`, `noImplicitReturns`, `noFallthroughCasesInSwitch`), ES2020 target, bundler module resolution
- Cross-ref: `PAGES_DOCUMENTATION.md`, `SITE_FLOW.md`

### 3. Build Toolchain
- **Vite 6.0.14** -- Dev server (port 8080), SWC-based React plugin (`@vitejs/plugin-react-swc 3.11.0`)
- **Manual chunks**: vendor, ui, charts, forms, supabase, utils, carousel (7 chunks)
- **PWA**: `vite-plugin-pwa 0.21.2` with Workbox (NetworkFirst for API, CacheFirst for storage, NetworkOnly for auth/edge functions)
- **Bundle analysis**: `rollup-plugin-visualizer 6.0.5`
- Cross-ref: `BUNDLE_OPTIMIZATION.md`

### 4. Styling & Design System
- **Tailwind CSS 3.4.19** -- Utility-first, dark mode via `class` strategy, custom HSL color tokens, semantic gradients/shadows
- **tailwindcss-animate 1.0.7** -- Animation utilities (accordion, celebration, shimmer, firework, star-twinkle)
- **PostCSS 8.5.6 + Autoprefixer 10.4.21** -- CSS processing pipeline
- **Font**: Nunito (primary sans-serif)
- **class-variance-authority 0.7.1** -- Type-safe component variants
- **clsx 2.1.1 + tailwind-merge 3.4.0** -- Conditional class composition via `cn()` utility
- Cross-ref: `GRAPHICS_TECH_STACK.md`, `COMPONENT_DOCUMENTATION.md`

### 5. UI Component Library
- **shadcn/ui** (configured via `components.json`, default style, slate base, CSS variables)
- **Radix UI Primitives** -- 24 packages (accordion through tooltip), all ^1.x-2.x
- **Lucide React 0.562.0** -- Icon library
- **cmdk 1.1.1** -- Command palette
- **vaul 1.1.2** -- Drawer component
- **embla-carousel-react 8.6.0** -- Carousel
- **react-day-picker 8.10.1** -- Calendar/date picker
- **input-otp 1.4.2** -- OTP input
- **react-resizable-panels 4.4.0** -- Resizable layouts
- **react-window 2.2.5** -- Virtualized lists
- **sonner 2.0.7** -- Toast notifications (alongside Radix toast)
- Cross-ref: `COMPONENT_DOCUMENTATION.md`, `STORYBOOK_GUIDE.md`

### 6. State Management
- **Zustand 5.0.10** -- 13 stores (auth, ui, admin, chore, gamification, analytics, progressAnalytics, performanceAnalytics, behaviorAnalytics, connection, lessonProgress, systemHealth, gameSession) plus 3 auth sub-stores
- **TanStack React Query 5.90.16** -- Server state, retry logic, 5min stale time, 10min GC
- Cross-ref: `STORES_DOCUMENTATION.md`, `ZUSTAND_DESIGN.md`

### 7. Forms & Validation
- **React Hook Form 7.71.0** -- Form state management
- **@hookform/resolvers 5.2.2** -- Schema resolver bridge
- **Zod 4.3.5** -- Schema validation
- Cross-ref: `COMPONENT_DOCUMENTATION.md`

### 8. Data Visualization
- **Recharts 3.6.0** -- Charts with HSL theming
- Cross-ref: `GRAPHICS_TECH_STACK.md`

### 9. Utilities
- **date-fns 4.1.0** -- Date manipulation
- **DOMPurify 3.3.1** -- HTML sanitization (XSS prevention)
- **jsPDF 4.0.0** -- PDF generation (certificates, reports)
- **web-vitals 5.1.0** -- Core Web Vitals monitoring
- **next-themes 0.4.6** -- Dark/light mode switching
- **react-error-boundary 6.0.3** -- Error boundary components

### 10. Backend: Supabase
- **@supabase/supabase-js 2.90.1** -- Client SDK (PKCE auth flow)
- **Database**: PostgreSQL with RLS (59 tables, 100+ security policies, 30+ security definer functions)
- **Auth**: Email/password, PKCE flow, JWT tokens, PIN-based child auth
- **Edge Functions**: 25 Deno functions (13 authenticated, 12 unauthenticated/system)
- **Shared modules**: `_shared/` with auth-validator, rate-limiter (tiered: auth vs anonymous), CORS, email-sender, security-headers, password-validator
- **Real-time**: PostgreSQL change streams via RealtimeManager service
- **Storage**: File storage with CacheFirst PWA strategy
- Cross-ref: `EDGE_FUNCTIONS_GUIDE.md`, `SUPABASE_SCHEMA.md`, `RLS_POLICIES_COMPREHENSIVE_GUIDE.md`, `SECURITY_FRAMEWORK.md`, `API_DOCUMENTATION.md`

### 11. Testing
- **Vitest 4.0.8** -- Unit/component/integration tests (jsdom environment)
- **@vitest/coverage-v8 4.0.18** -- Coverage (thresholds: 80/70/80/80)
- **@testing-library/react 16.3.1 + jest-dom 6.9.1 + user-event 14.6.1** -- Component testing
- **Playwright 1.57.0** -- E2E tests (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari), visual regression with screenshot diffing
- Cross-ref: `TESTING_GUIDE.md`, `RLS_TEST_SUITE_DOCUMENTATION.md`, `AUTH_E2E_COVERAGE_REPORT.md`

### 12. Visual Documentation
- **Storybook 8.6.14** -- Component catalog with a11y addon, interactions addon
- Cross-ref: `STORYBOOK_GUIDE.md`

### 13. Code Quality
- **ESLint 9.32.0** -- Flat config with typescript-eslint, react-hooks, react-refresh plugins
- **Key rules**: `no-console: error` (production), `@typescript-eslint/no-explicit-any: error`, `complexity: 15`, `max-depth: 4`, `max-lines-per-function: 150`
- **Overrides**: Relaxed rules for tests, stories, edge functions, scripts, logging utilities
- Cross-ref: `JSDOC_STANDARDS.md`, `TYPESCRIPT_STRICTNESS.md`, `LOGGING_STANDARDS.md`

### 14. Security Tooling
- **Snyk 1.1302.0** -- Dependency vulnerability scanning
- **npm audit** -- Built-in audit (moderate threshold)
- **DOMPurify** -- Runtime XSS prevention
- **Custom**: `secureLogging.ts`, `enhancedInputValidation.ts`, `securityEnhancedMonitoring.ts`, `adminRateLimiter.ts`
- Cross-ref: `SECURITY_FRAMEWORK.md`, `ENTERPRISE_SECURITY_PERFORMANCE.md`, `PROJECT_SECURITY_REVIEW.md`, `API_SECURITY_REVIEW.md`

### 15. CI/CD
- **GitHub Actions** -- 2 workflows (security-tests.yml, security.yml)
- **Lovable** -- Preview and production deployment (`chatterboxlife.lovable.app`)
- Cross-ref: `README.md`

### 16. PWA Capabilities
- **Workbox** (via vite-plugin-pwa) -- Service worker with runtime caching strategies per endpoint type
- **Manifest**: Standalone display, portrait orientation, education category
- Cross-ref: none (details self-contained in vite.config.ts)

### 17. Cross-Reference Index
A table mapping every knowledge file to which tech stack sections it covers, so readers can quickly navigate to detailed docs.

---

## Technical Notes

- All versions sourced from `package.json` lines 32-131
- TypeScript config split across `tsconfig.json` (base), `tsconfig.app.json` (app), `tsconfig.node.json` (build tools), `scripts/tsconfig.json` (CLI)
- Edge functions use Deno runtime with separate import maps (not npm)
- `react-is` pinned at `^19.2.3` in devDependencies (Storybook peer dep)
- 7 manual chunks configured in `vite.config.ts` for optimal code splitting
- 53 custom hooks in `src/hooks/`
- 29 type definition files in `src/types/`
- 25 utility modules in `src/utils/`
- 4 service modules in `src/services/`
- 15+ component directories under `src/components/`

