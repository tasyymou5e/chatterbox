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

## 📦 Manual Chunks Strategy

The build is split into logical chunks for optimal caching and loading performance.

### Chunk Configuration (vite.config.ts)

| Chunk | Contents | Rationale | Est. Size |
|-------|----------|-----------|-----------|
| **vendor** | React, React DOM | Core framework, rarely changes | ~45KB |
| **router** | React Router DOM | Routing logic, stable | ~15KB |
| **ui-radix-core** | Dialog, Dropdown, Popover, Select, Tabs, Tooltip, Slot | Most-used Radix components | ~35KB |
| **ui-radix-extended** | Accordion, Alert, Avatar, Checkbox, Collapsible, Context-menu, Hover-card, Label, Menubar, Navigation-menu, Progress, Radio-group, Scroll-area | Less frequently used | ~40KB |
| **charts** | Recharts | Heavy charting library, lazy-loaded | ~50KB |
| **forms** | React Hook Form, Zod | Form handling and validation | ~25KB |
| **state** | Zustand, React Query | State management | ~20KB |
| **supabase** | Supabase JS Client | Backend integration | ~30KB |

### Radix UI Split Strategy (2026-01-15 Optimization)

**Core Components** (`ui-radix-core`):
- Used on most pages
- Loaded early in app lifecycle
- Includes: Dialog, Dropdown Menu, Popover, Select, Tabs, Tooltip, Slot

**Extended Components** (`ui-radix-extended`):
- Used on specific pages only
- Lazy-loaded when needed
- Includes: Accordion, Alert Dialog, Aspect Ratio, Avatar, Checkbox, Collapsible, Context Menu, Hover Card, Label, Menubar, Navigation Menu, Progress, Radio Group, Scroll Area, Separator, Slider, Switch, Toggle, Toggle Group

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
  sourcemap: true,
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor': ['react', 'react-dom'],
        'router': ['react-router-dom'],
        'ui-radix-core': [
          '@radix-ui/react-dialog',
          '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-popover',
          '@radix-ui/react-select',
          '@radix-ui/react-tabs',
          '@radix-ui/react-tooltip',
          '@radix-ui/react-slot'
        ],
        'ui-radix-extended': [
          '@radix-ui/react-accordion',
          '@radix-ui/react-alert-dialog',
          // ... 13 more packages
        ],
        'charts': ['recharts'],
        'forms': ['react-hook-form', 'zod'],
        'state': ['zustand', '@tanstack/react-query'],
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
| 2026-01-15 | Split Radix UI into core/extended | ~15-20% initial JS reduction |
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
