# Bundle Optimization Guide

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run analyze` | Build and generate bundle visualization |
| `npm run analyze:open` | Build and auto-open visualization in browser |
| `npm run deps:check` | Check for outdated dependencies |
| `npm run deps:upgrade` | Update package.json with latest versions |
| `npm run deps:unused` | Find unused dependencies |
| `npm run bundle:size` | Show built file sizes |

## Manual Chunks Strategy

The build is split into logical chunks for optimal caching:

| Chunk | Contents | Rationale |
|-------|----------|-----------|
| **vendor** | React, React DOM | Core framework, rarely changes |
| **router** | React Router DOM | Routing logic, stable |
| **ui-radix** | Radix UI primitives | UI components, shared across app |
| **charts** | Recharts | Heavy charting library, lazy-loaded |
| **forms** | React Hook Form, Zod | Form handling and validation |
| **state** | Zustand, React Query | State management |
| **supabase** | Supabase JS Client | Backend integration |

## Running Bundle Analysis

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

## Optimization Tips

### 1. Lazy Load Routes
Use `React.lazy()` for admin and feature-heavy pages:
```tsx
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
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

## Bundle Size Targets

| Metric | Target | Current |
|--------|--------|---------|
| Initial JS | < 200KB gzipped | TBD |
| Largest chunk | < 100KB gzipped | TBD |
| Total assets | < 500KB gzipped | TBD |

Run `npm run bundle:size` after builds to track progress.

## Monitoring in CI/CD

Consider adding bundle size checks to your CI pipeline:
1. Generate `stats.json` during builds
2. Compare against baseline
3. Fail builds that exceed thresholds

## Troubleshooting

### Large Bundles
1. Run `npm run analyze` to identify large modules
2. Check if code-splitting can help
3. Look for duplicate dependencies
4. Consider lighter alternatives for heavy libraries

### Unused Dependencies
If `depcheck` reports false positives:
- Add to `.depcheckrc` ignore list
- Some dependencies are used dynamically or in config files
