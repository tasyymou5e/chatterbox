# Bundle Optimization Guide
**Last Updated: 2026-01-15**

---

## 📊 Current Bundle Status

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Initial JS | < 200KB gzipped | ~180KB | ✅ Meets |
| Largest chunk | < 100KB gzipped | ~50KB | ✅ Exceeds |
| Total assets | < 500KB gzipped | ~400KB | ✅ Meets |

---

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `npm run analyze` | Build and generate bundle visualization |
| `npm run analyze:open` | Build and auto-open visualization in browser |
| `npm run deps:check` | Check for outdated dependencies |
| `npm run deps:upgrade` | Update package.json with latest versions |
| `npm run deps:unused` | Find unused dependencies |
| `npm run bundle:size` | Show built file sizes |

---

## 📦 Manual Chunks Strategy (6 chunks)

The build is split into logical chunks for optimal caching and loading performance.

### Chunk Configuration (vite.config.ts)

| Chunk | Contents | Rationale | Est. Size |
|-------|----------|-----------|-----------|
| **vendor** | React, React DOM, React Router | Core framework + routing, rarely changes | ~60KB |
| **ui** | All 26 Radix UI components | UI primitives, consolidated for simplicity | ~75KB |
| **charts** | Recharts | Heavy charting library, lazy-loaded for admin/analytics only | ~50KB |
| **forms** | React Hook Form, Zod, Zustand, React Query | Form handling, validation, and state management | ~35KB |
| **supabase** | Supabase JS Client | Backend integration | ~25KB |
| **utils** | lucide-react, date-fns, clsx, tailwind-merge, CVA | Shared utilities, very stable, long-term caching | ~52KB |

### Charts Dynamic Imports (2026-01-22 Optimization)

The `recharts` library (~50KB) uses **true dynamic imports** with `React.lazy()` and `Suspense`:

| Lazy Component | Original | Loaded When |
|----------------|----------|-------------|
| `LazyEngagementChart` | `EngagementChart` | Admin dashboard renders |
| `LazyRetentionChart` | `RetentionChart` | Admin dashboard renders |
| `LazyFamilyGrowthChart` | `FamilyGrowthChart` | Reports tab clicked |
| `LazyLLMUsageTrendsChart` | `LLMUsageTrendsChart` | LLM monitoring page |

**Implementation**: 
- Lazy wrappers at `src/components/analytics/lazy/` and `src/components/admin/lazy/`
- Each wrapper includes `Suspense` with `ChartSkeleton` fallback
- Type-safe using `ComponentProps<>` inference

**Result**: The recharts chunk is only downloaded when a chart component actually mounts, not when the page loads.

---

## 🔍 Running Bundle Analysis

```bash
# Generate analysis (creates stats.html)
npm run analyze

# View the analysis
open stats.html  # macOS
xdg-open stats.html  # Linux
start stats.html  # Windows
```

The visualization shows:
- **Treemap**: Box sizes represent file sizes
- **Gzip/Brotli sizes**: Compressed sizes for realistic estimates
- **Module hierarchy**: Click to drill down into packages

---

## ⚡ Optimization Tips

### 1. Lazy Load Routes
Use `React.lazy()` for admin and feature-heavy pages:
```tsx
// Already implemented in src/pages/lazy/
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));

// Use LazyRoute wrapper for consistent loading
<LazyRoute>
  <AdminDashboard />
</LazyRoute>
```

### 2. Tree Shake Icons
Import specific icons instead of the entire library:
```tsx
// ✅ Good - tree shakes unused icons
import { Menu, X, ChevronDown } from 'lucide-react';

// ❌ Bad - imports entire icon library
import * as Icons from 'lucide-react';
```

### 3. Dynamic Imports for Heavy Components
Load large components on demand:
```tsx
const HeavyChart = lazy(() => import('@/components/analytics/HeavyChart'));
```

### 4. Check for Unused Dependencies
```bash
npm run deps:unused
```
Remove any dependencies that appear in the "Unused dependencies" list.

### 5. Keep Dependencies Updated
```bash
# Check for updates
npm run deps:check

# Apply updates (review changes first!)
npm run deps:upgrade
npm install
```

---

## 📈 Performance Monitoring

### Key Metrics to Track
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Total Blocking Time (TBT)**: < 200ms

### Lazy Loading Coverage
| Category | Lazy Loaded | Total | Coverage |
|----------|-------------|-------|----------|
| Admin Pages | 9 | 9 | 100% |
| Parent Pages | 4 | 4 | 100% |
| Feature Pages | 8 | 8 | 100% |
| Core Pages | 0 | 4 | 0% (intentional) |

---

## 🔧 Vite Configuration Highlights

```typescript
// vite.config.ts
build: {
  sourcemap: mode !== 'production',
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui': [
          '@radix-ui/react-dialog',
          '@radix-ui/react-dropdown-menu',
          // ... all 26 Radix packages
        ],
        'charts': ['recharts'],
        'forms': ['react-hook-form', '@hookform/resolvers', 'zod', 'zustand', '@tanstack/react-query'],
        'supabase': ['@supabase/supabase-js']
      }
    }
  }
}
```

---

## 🚨 Troubleshooting

### Large Bundles
1. Run `npm run analyze` to identify large modules
2. Check if code-splitting can help
3. Look for duplicate dependencies
4. Consider lighter alternatives for heavy libraries

### Unused Dependencies
If `depcheck` reports false positives:
- Add to `.depcheckrc` ignore list
- Some dependencies are used dynamically or in config files

### Slow Initial Load
1. Check if critical CSS is inlined
2. Verify lazy loading is working
3. Check for blocking scripts
4. Review third-party script impact

---

## 📅 Optimization History

| Date | Change | Impact |
|------|--------|--------|
| 2026-01-22 | Implemented React.lazy() for charts | True runtime lazy-loading for recharts |
| 2026-01-22 | Added utils chunk for shared libraries | Better cache granularity, ~52KB isolated |
| 2026-01-22 | Split features into charts/forms chunks | ~50KB reduction for non-admin users |
| 2026-01-22 | Consolidated to 6-chunk strategy | Simplified, better caching |
| 2025-12-18 | Added comprehensive lazy loading | ~30% initial JS reduction |
| 2025-12-01 | Implemented manual chunks | ~25% improvement in caching |

---

## 🎯 Future Optimizations

- [ ] Implement module federation for micro-frontends
- [ ] Add service worker for offline caching
- [ ] Explore Brotli compression at edge
- [ ] Consider switching to lighter chart library
- [ ] Implement critical CSS extraction

---

**Status**: Optimized | **Initial JS**: ~180KB | **Last Updated**: 2026-01-15
