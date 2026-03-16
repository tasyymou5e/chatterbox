/**
 * Chart Preloader Utility
 * 
 * Preloads chart component chunks in the background when users enter admin routes.
 * This reduces perceived latency when charts are about to be rendered.
 * 
 * Usage: Call preloadCharts() when admin routes mount (e.g., in AdminLayout useEffect)
 */

let preloadStarted = false;

/**
 * Preloads all chart components by triggering their dynamic imports.
 * Only runs once per session to avoid redundant network requests.
 */
export const preloadCharts = (): void => {
  if (preloadStarted) return;
  preloadStarted = true;

  // Use requestIdleCallback for non-blocking preload, with setTimeout fallback
  const schedulePreload = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 100));

  schedulePreload(() => {
    // Preload analytics charts
    import('@/components/analytics/EngagementChart').catch(() => {});
    import('@/components/analytics/RetentionChart').catch(() => {});
    import('@/components/analytics/FamilyGrowthChart').catch(() => {});
    
    // Preload admin charts
    import('@/components/admin/LLMUsageTrendsChart').catch(() => {});
  });
};

/**
 * Preloads specific chart components on demand.
 * Useful for targeted preloading based on route.
 */
export const preloadEngagementCharts = (): void => {
  import('@/components/analytics/EngagementChart').catch(() => {});
  import('@/components/analytics/RetentionChart').catch(() => {});
};

export const preloadFamilyGrowthChart = (): void => {
  import('@/components/analytics/FamilyGrowthChart').catch(() => {});
};

export const preloadLLMChart = (): void => {
  import('@/components/admin/LLMUsageTrendsChart').catch(() => {});
};
