

# Dead Code Removal Plan

## Confirmed Dead Files (0 imports anywhere)

| # | File | Type | Action |
|---|------|------|--------|
| 1 | `src/hooks/usePerformanceMonitoringWrapper.ts` | hook (147 lines) | DELETE |
| 2 | `src/hooks/useInterval.ts` | hook (32 lines) | DELETE |
| 3 | `src/hooks/useAsyncOperation.ts` | hook (211 lines) | DELETE |
| 4 | `src/hooks/useNavigationGuard.tsx` | hook (71 lines) | DELETE |
| 5 | `src/hooks/useKidsContentLoader.ts` | hook (166 lines) | DELETE |
| 6 | `src/hooks/useIllustration.ts` | hook (94 lines) | DELETE |
| 7 | `src/hooks/useStarProgress.ts` | hook (145 lines) | DELETE |
| 8 | `src/hooks/useProgress.ts` | hook (119 lines) | DELETE |
| 9 | `src/utils/securityEnhancedMonitoring.ts` | util (342 lines) | DELETE |
| 10 | `src/utils/secureProfileAccess.ts` | util (172 lines) | DELETE |
| 11 | `src/utils/asyncErrorHandler.ts` | util | DELETE |
| 12 | `src/utils/CacheManager.ts` | util | DELETE |
| 13 | `src/utils/performanceMonitor.ts` | util | DELETE |
| 14 | `src/services/UnifiedContentService.ts` | service (269 lines) | DELETE |
| 15 | `src/types/navigator.ts` | ambient types (19 lines) | KEEP (global declarations, no import needed) |
| 16 | `src/types/errors.ts` | types (157 lines) | DELETE |
| 17 | `src/types/common.ts` | types (167 lines) | DELETE |
| 18 | `src/types/components.ts` | types (140 lines) | DELETE |
| 19 | `src/stores/_storeTemplate.ts` | template (236 lines) | KEEP (reference template, not meant to be imported) |

**Total: 17 dead files to delete** (~2,100+ lines removed)

## Execution Batches

**Batch A** — Dead hooks (8 files):
Delete `usePerformanceMonitoringWrapper.ts`, `useInterval.ts`, `useAsyncOperation.ts`, `useNavigationGuard.tsx`, `useKidsContentLoader.ts`, `useIllustration.ts`, `useStarProgress.ts`, `useProgress.ts`

**Batch B** — Dead utils (5 files):
Delete `securityEnhancedMonitoring.ts`, `secureProfileAccess.ts`, `asyncErrorHandler.ts`, `CacheManager.ts`, `performanceMonitor.ts`

**Batch C** — Dead service + types (4 files):
Delete `UnifiedContentService.ts`, `errors.ts`, `common.ts`, `components.ts`

## Kept (False Positive Guards)

- `src/types/navigator.ts` — ambient `declare global` augmentations (no import needed, consumed by TypeScript compiler)
- `src/stores/_storeTemplate.ts` — developer reference template (documented purpose, not meant to be imported)

## Post-Deletion Verification

Type-check (`tsc --noEmit`) and build (`vite build`) must pass. No runtime imports reference any of these 17 files.

