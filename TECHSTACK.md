# TECHSTACK.md — Chatterbox Comprehensive Tech Stack

> **Last Updated:** 2026-02-17  
> **Purpose:** Single authoritative reference for every technology used across the Chatterbox application. For deep dives on any topic, follow the cross-reference links to dedicated knowledge files.

---

## Quick-Reference Table

| Category | Technology | Version | Config File |
|----------|-----------|---------|-------------|
| UI Library | React | 18.3.1 | `src/main.tsx` |
| DOM Renderer | React DOM | 18.3.1 | `src/main.tsx` |
| Routing | React Router DOM | 7.12.0 | `src/App.tsx` |
| Language | TypeScript | 5.8.3 | `tsconfig.json`, `tsconfig.app.json` |
| Bundler | Vite | 6.0.14 | `vite.config.ts` |
| SWC Plugin | @vitejs/plugin-react-swc | 3.11.0 | `vite.config.ts` |
| CSS Framework | Tailwind CSS | 3.4.19 | `tailwind.config.ts` |
| CSS Animations | tailwindcss-animate | 1.0.7 | `tailwind.config.ts` |
| PostCSS | PostCSS + Autoprefixer | 8.5.6 / 10.4.21 | `postcss.config.js` |
| Component Variants | class-variance-authority | 0.7.1 | — |
| Class Merging | clsx + tailwind-merge | 2.1.1 / 3.4.0 | `src/lib/utils.ts` |
| UI Primitives | Radix UI | ^1.x–2.x (24 pkgs) | `components.json` |
| Icons | Lucide React | 0.562.0 | — |
| Command Palette | cmdk | 1.1.1 | — |
| Drawer | vaul | 1.1.2 | — |
| Carousel | embla-carousel-react | 8.6.0 | — |
| Date Picker | react-day-picker | 8.10.1 | — |
| OTP Input | input-otp | 1.4.2 | — |
| Resizable Panels | react-resizable-panels | 4.4.0 | — |
| Virtual Lists | react-window | 2.2.5 | — |
| Toast (Sonner) | sonner | 2.0.7 | — |
| State (Client) | Zustand | 5.0.10 | `src/stores/` |
| State (Server) | TanStack React Query | 5.90.16 | `src/main.tsx` |
| Forms | React Hook Form | 7.71.0 | — |
| Schema Resolver | @hookform/resolvers | 5.2.2 | — |
| Validation | Zod | 4.3.5 | — |
| Charts | Recharts | 3.6.0 | — |
| Dates | date-fns | 4.1.0 | — |
| Sanitization | DOMPurify | 3.3.1 | — |
| PDF Generation | jsPDF | 4.0.0 | — |
| Web Vitals | web-vitals | 5.1.0 | — |
| Theming | next-themes | 0.4.6 | — |
| Error Boundaries | react-error-boundary | 6.0.3 | — |
| Backend SDK | @supabase/supabase-js | 2.90.1 | `src/integrations/supabase/client.ts` |
| PWA | vite-plugin-pwa | 0.21.2 | `vite.config.ts` |
| Bundle Analyzer | rollup-plugin-visualizer | 6.0.5 | `vite.config.ts` |
| Unit Tests | Vitest | 4.0.8 | `vitest.config.ts` |
| Coverage | @vitest/coverage-v8 | 4.0.18 | `vitest.config.ts` |
| Component Tests | @testing-library/react | 16.3.1 | — |
| Test Matchers | @testing-library/jest-dom | 6.9.1 | — |
| User Events | @testing-library/user-event | 14.6.1 | — |
| E2E Tests | Playwright | 1.57.0 | `playwright.config.ts` |
| Storybook | Storybook | 8.6.14 | `.storybook/` |
| Linting | ESLint | 9.32.0 | `eslint.config.js` |
| Dep Scanning | Snyk | 1.1302.0 | `.github/workflows/` |

---

## 1. Frontend Runtime

### React 18.3.1
- Component library with **StrictMode** enabled in `src/main.tsx`
- Automatic JSX transform (no manual `import React` needed in most files)
- Concurrent features available but not yet opted into (no `useTransition`/`useDeferredValue` usage)

### React DOM 18.3.1
- `createRoot` API for concurrent-capable rendering
- Hydration not used (client-side SPA)

### React Router DOM 7.12.0
- Client-side routing with **lazy-loaded route groups**: core, parent, kids, admin, feature, support, connect, game
- Route-level code splitting via `React.lazy()` + `Suspense`
- Auth guards on protected routes

### TypeScript 5.8.3
- **Strict mode** enabled: `noImplicitAny`, `strictNullChecks`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- Target: **ES2020**, Module resolution: **bundler**
- Config split across 4 files:
  - `tsconfig.json` — base/shared settings
  - `tsconfig.app.json` — application source
  - `tsconfig.node.json` — build tooling (Vite config, scripts)
  - `scripts/tsconfig.json` — CLI scripts (ES2022 target, NodeNext resolution)

> **Cross-ref:** [`PAGES_DOCUMENTATION.md`](./PAGES_DOCUMENTATION.md) · [`SITE_FLOW.md`](./SITE_FLOW.md)

---

## 2. Build Toolchain

### Vite 6.0.14
- Dev server on **port 8080** with IPv6 (`host: "::"`)
- SWC-based React plugin (`@vitejs/plugin-react-swc 3.11.0`) for fast JSX transforms
- Source maps **disabled** in production builds for security

### Manual Chunks (7 splits)
Configured in `vite.config.ts` → `build.rollupOptions.output.manualChunks`:

| Chunk | Contents | Approx Size |
|-------|----------|-------------|
| `vendor` | react, react-dom, react-router-dom | ~45 KB |
| `ui` | 24 Radix UI packages | ~80 KB |
| `charts` | recharts | ~50 KB |
| `forms` | react-hook-form, resolvers, zod, zustand, react-query | ~35 KB |
| `supabase` | @supabase/supabase-js | ~30 KB |
| `utils` | lucide-react, date-fns, clsx, tailwind-merge, cva | ~52 KB |
| `carousel` | embla-carousel-react, react-day-picker | ~25 KB |

### PWA (vite-plugin-pwa 0.21.2)
- **Workbox** service worker with `autoUpdate` registration
- Runtime caching strategies by endpoint:

| URL Pattern | Strategy | Cache Name | TTL |
|-------------|----------|------------|-----|
| Supabase REST API | NetworkFirst | `supabase-api-cache` | 1 hour |
| Supabase Edge Functions | NetworkOnly | — | — |
| Supabase Auth | NetworkOnly | — | — |
| Supabase Storage | CacheFirst | `supabase-storage-cache` | 1 week |
| Google Fonts CSS | StaleWhileRevalidate | `google-fonts-stylesheets` | 1 year |
| Google Fonts Files | CacheFirst | `google-fonts-webfonts` | 1 year |

- Manifest: standalone display, portrait orientation, `education` category
- PWA disabled in development (`devOptions.enabled: false`)

### Bundle Analysis
- `rollup-plugin-visualizer 6.0.5` generates `stats.html` in production builds
- Treemap template with gzip + brotli size reporting

> **Cross-ref:** [`BUNDLE_OPTIMIZATION.md`](./BUNDLE_OPTIMIZATION.md)

---

## 3. Styling & Design System

### Tailwind CSS 3.4.19
- **Utility-first** CSS framework
- Dark mode via `class` strategy
- Custom HSL color tokens defined in `index.css` as CSS variables (`--background`, `--foreground`, `--primary`, etc.)
- Semantic gradients and shadows in the design system
- Content paths: `./pages/**/*.{ts,tsx}`, `./components/**/*.{ts,tsx}`, `./app/**/*.{ts,tsx}`, `./src/**/*.{ts,tsx}`

### Animation (tailwindcss-animate 1.0.7)
Custom keyframe animations: accordion open/close, celebration, shimmer, firework, star-twinkle

### CSS Pipeline
- **PostCSS 8.5.6** with **Autoprefixer 10.4.21** for vendor prefixing
- Tailwind CSS as PostCSS plugin

### Typography
- **Nunito** — primary sans-serif font (loaded via Google Fonts)

### Utility Functions
- **`cn()` helper** (`src/lib/utils.ts`): Combines `clsx 2.1.1` + `tailwind-merge 3.4.0` for conditional, conflict-free class composition
- **`class-variance-authority 0.7.1`**: Type-safe component variants (used in all shadcn components)

> **Cross-ref:** [`GRAPHICS_TECH_STACK.md`](./GRAPHICS_TECH_STACK.md) · [`COMPONENT_DOCUMENTATION.md`](./COMPONENT_DOCUMENTATION.md)

---

## 4. UI Component Library

### shadcn/ui
- Configured via `components.json`: **default** style, **slate** base color, CSS variables enabled
- Components are copied into `src/components/ui/` (not a runtime dependency)
- All components use Radix UI primitives underneath

### Radix UI Primitives (24 packages)
All `^1.x–2.x`: accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip

### Additional UI Libraries

| Package | Version | Purpose |
|---------|---------|---------|
| Lucide React | 0.562.0 | Icon library (~1000 icons) |
| cmdk | 1.1.1 | Command palette / search |
| vaul | 1.1.2 | Mobile-friendly drawer |
| embla-carousel-react | 8.6.0 | Touch-enabled carousel |
| react-day-picker | 8.10.1 | Calendar / date picker |
| input-otp | 1.4.2 | PIN / OTP code input |
| react-resizable-panels | 4.4.0 | Resizable layout panels |
| react-window | 2.2.5 | Virtualized list rendering |
| sonner | 2.0.7 | Toast notifications (stackable) |
| Radix Toast | ^1.2.14 | Toast notifications (shadcn variant) |

> **Cross-ref:** [`COMPONENT_DOCUMENTATION.md`](./COMPONENT_DOCUMENTATION.md) · [`STORYBOOK_GUIDE.md`](./STORYBOOK_GUIDE.md)

---

## 5. State Management

### Zustand 5.0.10 — Client State
13 stores + 3 auth sub-stores:

| Store | Purpose |
|-------|---------|
| `authStore` | Authentication state, user session, role |
| `uiStore` | Loading states, modals, sidebar, theme |
| `adminStore` | Admin dashboard state |
| `choreStore` | Chore CRUD, categories, templates, assignments |
| `gamificationStore` | Points, achievements, streaks, levels |
| `analyticsStore` | Platform-wide analytics |
| `progressAnalyticsStore` | Child progress tracking |
| `performanceAnalyticsStore` | Performance metrics |
| `behaviorAnalyticsStore` | Behavioral event tracking |
| `connectionStore` | Family connections state |
| `lessonProgressStore` | Lesson/content progress |
| `systemHealthStore` | System health monitoring |
| `gameSessionStore` | Active game session state |

Auth sub-stores: `authActions`, `authSelectors`, `authSubscriptions`

### TanStack React Query 5.90.16 — Server State
Configured in `src/main.tsx`:
- **Retry logic**: No retry on 4xx errors; up to 3 retries with exponential backoff for others
- **Stale time**: 5 minutes
- **GC time**: 10 minutes
- **Mutation retry**: 1 attempt with 1s delay

> **Cross-ref:** [`STORES_DOCUMENTATION.md`](./STORES_DOCUMENTATION.md) · [`ZUSTAND_DESIGN.md`](./ZUSTAND_DESIGN.md)

---

## 6. Forms & Validation

| Package | Version | Role |
|---------|---------|------|
| React Hook Form | 7.71.0 | Form state, field registration, submission |
| @hookform/resolvers | 5.2.2 | Bridge between RHF and Zod schemas |
| Zod | 4.3.5 | Schema declaration and runtime validation |

Pattern: Zod schema → `zodResolver` → `useForm()` → type-safe form with validated inputs

> **Cross-ref:** [`COMPONENT_DOCUMENTATION.md`](./COMPONENT_DOCUMENTATION.md)

---

## 7. Data Visualization

### Recharts 3.6.0
- React-based charting library
- Uses HSL color tokens from the design system for consistent theming
- Chart types in use: Line, Bar, Area, Pie, Radar, Composed
- Lazy-loaded via the `charts` manual chunk (~50 KB, only loaded on admin/analytics routes)

> **Cross-ref:** [`GRAPHICS_TECH_STACK.md`](./GRAPHICS_TECH_STACK.md)

---

## 8. Utilities

| Package | Version | Purpose |
|---------|---------|---------|
| date-fns | 4.1.0 | Date manipulation and formatting (tree-shakeable) |
| DOMPurify | 3.3.1 | HTML sanitization — XSS prevention for user-generated content |
| jsPDF | 4.0.0 | Client-side PDF generation (certificates, progress reports) |
| web-vitals | 5.1.0 | Core Web Vitals monitoring (LCP, FID, CLS, FCP, TTFB) |
| next-themes | 0.4.6 | Dark/light mode switching with system preference detection |
| react-error-boundary | 6.0.3 | Declarative error boundary components with fallback UI |

### Custom Utility Modules (25 modules in `src/utils/`)
Key modules:
- `logger.ts` — Structured application logging
- `secureLogging.ts` — Sensitive data redaction in logs
- `enhancedInputValidation.ts` — Input sanitization beyond Zod
- `securityEnhancedMonitoring.ts` — Runtime security event tracking
- `adminRateLimiter.ts` — Client-side rate limiting for admin actions
- `initializationLogger.ts` — App startup phase tracking

---

## 9. Backend: Supabase

### Client SDK
- **@supabase/supabase-js 2.90.1** with PKCE authentication flow
- Client configured in `src/integrations/supabase/client.ts`
- Auto-generated types in `src/integrations/supabase/types.ts`

### Database
- **PostgreSQL** with Row Level Security (RLS)
- **59 tables** across domains: auth, families, chores, gamification, content, analytics, admin, monitoring
- **100+ RLS policies** enforcing row-level access control
- **30+ security definer functions** for privileged operations
- All `select('*')` queries replaced with explicit column lists (optimized 2026-02-09)

### Authentication
- Email/password with PKCE flow
- JWT tokens for API authorization
- PIN-based child account authentication (no email/password for children)
- Session management via Supabase Auth hooks

### Edge Functions (27 Deno Functions)

| Auth Type | Count | Examples |
|-----------|-------|---------|
| Authenticated (JWT) | 15 | admin-delete-user, family-integrity-check, manage-llm-provider, security-monitoring |
| Unauthenticated / System | 12 | grok-chat, text-to-speech, error-collector, edge-function-health-check |

**Shared Modules** (`supabase/functions/_shared/`):

| Module | Purpose |
|--------|---------|
| `auth-validator` | JWT validation and user extraction |
| `rate-limiter` | Tiered rate limiting (auth vs anonymous) |
| `cors` | CORS header configuration |
| `email-sender` | Transactional email dispatch |
| `security-headers` | Security response headers |
| `password-validator` | Password strength validation |

**Tiered Rate Limiting** (implemented 2026-02-09):

| User Type | LLM Requests | TTS Requests |
|-----------|-------------|-------------|
| Authenticated | 10/minute | 15/minute |
| Anonymous | 2/minute | 3/minute |

### Real-time
- PostgreSQL change streams via `RealtimeManager` service (`src/services/`)
- Used for live updates in family activity feeds and admin monitoring

### Storage
- File storage for avatars, completion photos
- PWA CacheFirst strategy (1 week TTL, 50 max entries)

> **Cross-ref:** [`EDGE_FUNCTIONS_GUIDE.md`](./EDGE_FUNCTIONS_GUIDE.md) · [`SUPABASE_SCHEMA.md`](./SUPABASE_SCHEMA.md) · [`RLS_POLICIES_COMPREHENSIVE_GUIDE.md`](./RLS_POLICIES_COMPREHENSIVE_GUIDE.md) · [`SECURITY_FRAMEWORK.md`](./SECURITY_FRAMEWORK.md) · [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)

---

## 10. Testing

### Unit & Component Tests
- **Vitest 4.0.8** — Test runner with jsdom environment
- **@vitest/coverage-v8 4.0.18** — Coverage with thresholds:

| Metric | Threshold |
|--------|-----------|
| Statements | 80% |
| Branches | 70% |
| Functions | 80% |
| Lines | 80% |

- **@testing-library/react 16.3.1** — Component rendering and queries
- **@testing-library/jest-dom 6.9.1** — DOM assertion matchers
- **@testing-library/user-event 14.6.1** — User interaction simulation

### E2E Tests
- **Playwright 1.57.0** — Cross-browser end-to-end testing
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Visual regression testing with screenshot diffing

### Test Organization
```
tests/
├── component/          # Component and hook tests
│   └── hooks/          # Custom hook tests
├── e2e/                # Playwright E2E tests
├── integration/        # Integration tests
└── unit/               # Pure unit tests
```

> **Cross-ref:** [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) · [`RLS_TEST_SUITE_DOCUMENTATION.md`](./RLS_TEST_SUITE_DOCUMENTATION.md) · [`AUTH_E2E_COVERAGE_REPORT.md`](./AUTH_E2E_COVERAGE_REPORT.md)

---

## 11. Visual Documentation

### Storybook 8.6.14
- Component catalog with live examples
- **Addons**: a11y (accessibility checks), interactions (interaction testing)
- `react-is` pinned at `^19.2.3` in devDependencies (Storybook peer dep)
- Configuration in `.storybook/`

> **Cross-ref:** [`STORYBOOK_GUIDE.md`](./STORYBOOK_GUIDE.md)

---

## 12. Code Quality

### ESLint 9.32.0
- **Flat config** format (`eslint.config.js`)
- Plugins: `typescript-eslint`, `react-hooks`, `react-refresh`

**Key Rules:**

| Rule | Value | Rationale |
|------|-------|-----------|
| `no-console` | error | Enforce structured logging in production |
| `@typescript-eslint/no-explicit-any` | error | Type safety enforcement |
| `complexity` | 15 | Keep functions understandable |
| `max-depth` | 4 | Prevent deep nesting |
| `max-lines-per-function` | 150 | Encourage decomposition |

**Overrides**: Relaxed rules for test files (`*.test.*`), Storybook stories (`*.stories.*`), edge functions (`supabase/functions/`), scripts (`scripts/`), and logging utilities.

> **Cross-ref:** [`JSDOC_STANDARDS.md`](./JSDOC_STANDARDS.md) · [`TYPESCRIPT_STRICTNESS.md`](./TYPESCRIPT_STRICTNESS.md) · [`LOGGING_STANDARDS.md`](./LOGGING_STANDARDS.md)

---

## 13. Security Tooling

### Dependency Scanning
- **Snyk 1.1302.0** — Automated vulnerability scanning via GitHub Actions
- **npm audit** — Built-in audit with moderate severity threshold

### Runtime Security
- **DOMPurify 3.3.1** — Sanitize all user-generated HTML before rendering
- **Custom modules**:
  - `secureLogging.ts` — Redacts PII, tokens, and sensitive data from log output
  - `enhancedInputValidation.ts` — Defense-in-depth input validation beyond Zod schemas
  - `securityEnhancedMonitoring.ts` — Runtime anomaly detection and security event tracking
  - `adminRateLimiter.ts` — Client-side rate limiting for admin operations

### Edge Function Security
- Tiered rate limiting (auth vs anonymous)
- Security headers on all responses
- JWT validation via shared `auth-validator` module
- CORS configuration via shared `cors` module

> **Cross-ref:** [`SECURITY_FRAMEWORK.md`](./SECURITY_FRAMEWORK.md) · [`ENTERPRISE_SECURITY_PERFORMANCE.md`](./ENTERPRISE_SECURITY_PERFORMANCE.md) · [`PROJECT_SECURITY_REVIEW.md`](./PROJECT_SECURITY_REVIEW.md) · [`API_SECURITY_REVIEW.md`](./API_SECURITY_REVIEW.md)

---

## 14. CI/CD & Deployment

### GitHub Actions
- **`security-tests.yml`** — Automated security test suite
- **`security.yml`** — Snyk dependency scanning + npm audit

### Lovable Platform
- **Preview**: `https://id-preview--5c4d8bc1-8637-4345-9500-90d86342204e.lovable.app`
- **Production**: `https://chatterboxlife.lovable.app`
- Automatic deployments on commit

> **Cross-ref:** [`README.md`](./README.md)

---

## 15. Codebase Statistics

| Category | Count |
|----------|-------|
| Custom hooks | 53 (`src/hooks/`) |
| Type definition files | 29 (`src/types/`) |
| Utility modules | 25 (`src/utils/`) |
| Service modules | 4 (`src/services/`) |
| Component directories | 15+ (`src/components/`) |
| Zustand stores | 13 + 3 sub-stores (`src/stores/`) |
| Database tables | 59 |
| RLS policies | 100+ |
| Edge functions | 27 (`supabase/functions/`) |
| Manual chunks | 7 |

---

## 16. Cross-Reference Index

| Knowledge File | Sections Covered |
|---------------|-----------------|
| [`PROJECT_KNOWLEDGE.md`](./PROJECT_KNOWLEDGE.md) | All sections (overview) |
| [`PAGES_DOCUMENTATION.md`](./PAGES_DOCUMENTATION.md) | §1 Frontend Runtime, Routing |
| [`SITE_FLOW.md`](./SITE_FLOW.md) | §1 Frontend Runtime, Routing |
| [`BUNDLE_OPTIMIZATION.md`](./BUNDLE_OPTIMIZATION.md) | §2 Build Toolchain |
| [`GRAPHICS_TECH_STACK.md`](./GRAPHICS_TECH_STACK.md) | §3 Styling, §7 Data Visualization |
| [`COMPONENT_DOCUMENTATION.md`](./COMPONENT_DOCUMENTATION.md) | §3 Styling, §4 UI Library, §6 Forms |
| [`STORYBOOK_GUIDE.md`](./STORYBOOK_GUIDE.md) | §4 UI Library, §11 Visual Documentation |
| [`STORES_DOCUMENTATION.md`](./STORES_DOCUMENTATION.md) | §5 State Management |
| [`ZUSTAND_DESIGN.md`](./ZUSTAND_DESIGN.md) | §5 State Management |
| [`EDGE_FUNCTIONS_GUIDE.md`](./EDGE_FUNCTIONS_GUIDE.md) | §9 Backend: Supabase |
| [`SUPABASE_SCHEMA.md`](./SUPABASE_SCHEMA.md) | §9 Backend: Supabase |
| [`RLS_POLICIES_COMPREHENSIVE_GUIDE.md`](./RLS_POLICIES_COMPREHENSIVE_GUIDE.md) | §9 Backend: Supabase |
| [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) | §9 Backend: Supabase |
| [`SECURITY_FRAMEWORK.md`](./SECURITY_FRAMEWORK.md) | §9 Backend, §13 Security |
| [`ENTERPRISE_SECURITY_PERFORMANCE.md`](./ENTERPRISE_SECURITY_PERFORMANCE.md) | §13 Security |
| [`PROJECT_SECURITY_REVIEW.md`](./PROJECT_SECURITY_REVIEW.md) | §13 Security |
| [`API_SECURITY_REVIEW.md`](./API_SECURITY_REVIEW.md) | §9 Backend, §13 Security |
| [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) | §10 Testing |
| [`RLS_TEST_SUITE_DOCUMENTATION.md`](./RLS_TEST_SUITE_DOCUMENTATION.md) | §10 Testing |
| [`AUTH_E2E_COVERAGE_REPORT.md`](./AUTH_E2E_COVERAGE_REPORT.md) | §10 Testing |
| [`JSDOC_STANDARDS.md`](./JSDOC_STANDARDS.md) | §12 Code Quality |
| [`TYPESCRIPT_STRICTNESS.md`](./TYPESCRIPT_STRICTNESS.md) | §12 Code Quality |
| [`LOGGING_STANDARDS.md`](./LOGGING_STANDARDS.md) | §12 Code Quality |
| [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) | All sections (status tracking) |
| [`INCOMPLETE_ITEMS.md`](./INCOMPLETE_ITEMS.md) | All sections (remaining work) |
| [`CURRENT_ISSUES.md`](./CURRENT_ISSUES.md) | All sections (known issues) |

---

## 17. Technical Notes

- All versions sourced from `package.json`
- TypeScript config split across 4 files (see §1)
- Edge functions use **Deno runtime** with separate import maps (not npm)
- 7 manual chunks configured in `vite.config.ts` for optimal code splitting
- `select('*')` queries fully optimized across frontend and edge functions (2026-02-09)
- Tiered rate limiting implemented for anonymous-accessible edge functions (2026-02-09)
- Admin user deletion via `admin-delete-user` edge function with full auth cleanup (2026-02-17)
- Bulk delete operations for users and families via `BulkDeleteConfirmDialog` component (2026-02-17)
- `delete-family-comprehensive` supports `preserveUserAccounts` parameter for non-test families (2026-02-17)
