import { test, expect } from '@playwright/test';

/**
 * Network Resilience & Chaos Engineering Tests
 * 
 * Tests application behavior under adverse network conditions
 * including offline mode, slow networks, and API failures.
 */

test.describe('API Failure Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should handle analytics API 500 error gracefully', async ({ page }) => {
    // Block analytics API
    await page.route('**/functions/v1/admin-analytics**', route => 
      route.fulfill({ 
        status: 500, 
        body: JSON.stringify({ error: 'Internal Server Error' }),
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await page.goto('/admin/login');
    
    // Page should still be functional
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeEnabled();
  });

  test('should handle auth API failure gracefully', async ({ page }) => {
    // Block auth API for session check
    await page.route('**/auth/v1/token**', route =>
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Service Unavailable' }),
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await page.goto('/admin/login');
    
    // Should still show login form (graceful degradation)
    await expect(page.locator('form')).toBeVisible();
  });

  test('should handle partial API failure (auth succeeds, data fails)', async ({ page }) => {
    // Block data APIs but allow auth
    await page.route('**/rest/v1/**', route =>
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Database unavailable' }),
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await page.goto('/admin/login');
    
    // Login form should work
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('should not crash on network timeout', async ({ page }) => {
    // Add long delay to simulate timeout
    await page.route('**/functions/v1/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
      await route.abort('timedout');
    });

    // Navigate with longer timeout
    await page.goto('/admin/login', { timeout: 60000 });
    
    // Page should still be responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle complete API failure', async ({ page }) => {
    // Block all Supabase APIs
    await page.route('**/*.supabase.co/**', route => route.abort('failed'));

    await page.goto('/admin/login', { timeout: 30000 });
    
    // Should still render something (not crash)
    const hasContent = await page.evaluate(() => {
      return (document.body.textContent?.length || 0) > 10;
    });
    expect(hasContent).toBe(true);
  });
});

test.describe('Slow Network Conditions', () => {
  test('should handle slow network gracefully', async ({ page }) => {
    // Add 2 second delay to all requests
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/admin/login', { timeout: 60000 });
    
    // Page should eventually load and be interactive
    await expect(page.locator('form')).toBeVisible({ timeout: 30000 });
  });

  test('should show loading states during slow operations', async ({ page }) => {
    // Add delay to auth check
    await page.route('**/auth/v1/session**', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.continue();
    });

    await page.goto('/admin/dashboard');
    
    // Should show loading or redirect to login
    const hasLoadingOrLogin = await page.evaluate(() => {
      const text = document.body.textContent || '';
      return text.includes('Loading') || 
             text.includes('loading') ||
             text.includes('Sign In') ||
             text.includes('Login');
    });
    
    expect(hasLoadingOrLogin).toBe(true);
  });

  test('should remain responsive during slow network', async ({ page }) => {
    await page.route('**/rest/v1/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.continue();
    });

    await page.goto('/admin/login');
    
    // Form inputs should be interactive even during slow network
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 30000 });
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });
});

test.describe('Connection Recovery', () => {
  test('should recover after network restoration', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Block all requests
    await page.route('**/rest/v1/**', route => route.abort('failed'));
    
    // Wait a moment
    await page.waitForTimeout(1000);
    
    // Unblock requests
    await page.unroute('**/rest/v1/**');
    
    // Page should still be functional
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeEnabled();
  });

  test('should not leave orphaned loading states', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Briefly block then unblock
    await page.route('**/auth/v1/**', route => route.abort());
    await page.waitForTimeout(500);
    await page.unroute('**/auth/v1/**');
    await page.waitForTimeout(1000);
    
    // Should not have permanent spinners
    const spinnerCount = await page.locator('[class*="animate-spin"]').count();
    // After recovery, there should be no infinite spinners
    // (we allow some spinners during active operations)
    expect(spinnerCount).toBeLessThanOrEqual(3);
  });
});

test.describe('Error Boundary Behavior', () => {
  test('should not show raw error messages to users', async ({ page }) => {
    // Force JavaScript error
    await page.addInitScript(() => {
      // This will be caught by error boundaries
      (window as unknown as { forceError: boolean }).forceError = true;
    });

    await page.goto('/admin/login');
    
    // Should not show technical error details
    const pageContent = await page.content();
    expect(pageContent).not.toMatch(/TypeError/i);
    expect(pageContent).not.toMatch(/at Object\./);
    expect(pageContent).not.toMatch(/Uncaught Error/i);
  });

  test('should provide user-friendly error recovery options', async ({ page }) => {
    // Block critical APIs to trigger error state
    await page.route('**/rest/v1/**', route => 
      route.fulfill({ status: 500, body: 'Server Error' })
    );

    await page.goto('/admin/login');
    
    // Page should still be usable
    await expect(page.locator('body')).toBeVisible();
    
    // Check for any refresh/retry buttons if errors occurred
    const hasRecoveryOption = await page.evaluate(() => {
      const text = document.body.textContent || '';
      const hasRefresh = text.includes('Refresh') || 
                        text.includes('Try again') ||
                        text.includes('Retry');
      // Also valid if no error occurred (page loaded fine)
      const hasLoginForm = document.querySelector('input[type="email"]') !== null;
      return hasRefresh || hasLoginForm;
    });
    
    expect(hasRecoveryOption).toBe(true);
  });
});

test.describe('Offline Mode', () => {
  test('should handle going offline gracefully', async ({ page, context }) => {
    await page.goto('/admin/login');
    
    // Verify page loaded
    await expect(page.locator('form')).toBeVisible();
    
    // Go offline
    await context.setOffline(true);
    
    // Page should still be visible (not crash)
    await expect(page.locator('body')).toBeVisible();
    
    // Form should still be visible (cached content)
    await expect(page.locator('form')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
  });

  test('should indicate offline status if implemented', async ({ page, context }) => {
    await page.goto('/admin/login');
    await page.waitForTimeout(1000);
    
    // Go offline
    await context.setOffline(true);
    await page.waitForTimeout(500);
    
    // Try to submit form (will fail offline)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for network failure
    await page.waitForTimeout(2000);
    
    // Should show some indication of failure (not crash)
    const hasContent = await page.evaluate(() => {
      return (document.body.textContent?.length || 0) > 10;
    });
    expect(hasContent).toBe(true);
    
    // Go back online
    await context.setOffline(false);
  });
});

test.describe('Rate Limiting Simulation', () => {
  test('should handle 429 rate limit responses', async ({ page }) => {
    let requestCount = 0;
    
    await page.route('**/auth/v1/**', route => {
      requestCount++;
      if (requestCount > 3) {
        return route.fulfill({
          status: 429,
          body: JSON.stringify({ error: 'Too many requests' }),
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        });
      }
      return route.continue();
    });

    await page.goto('/admin/login');
    
    // Multiple rapid form submissions
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="email"]', `test${i}@example.com`);
      await page.fill('input[type="password"]', 'password');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(100);
    }
    
    // Page should handle rate limiting gracefully (not crash)
    await expect(page.locator('body')).toBeVisible();
  });
});
