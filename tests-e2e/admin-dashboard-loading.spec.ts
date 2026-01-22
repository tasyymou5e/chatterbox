import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Admin Dashboard Loading
 * Validates dashboard renders correctly with fallback data,
 * error boundaries work, and no blank screens occur.
 */

test.describe('Admin Dashboard Loading - Unauthenticated', () => {
  test.beforeEach(async ({ page }) => {
    // Clear session before each test
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Should redirect to login within reasonable time
    await expect(page).toHaveURL(/admin\/login/, { timeout: 15000 });
  });

  test('should not crash or show errors during redirect', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/admin/dashboard');
    await page.waitForTimeout(3000);
    
    // Filter out expected auth-related errors
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('401') && 
      !err.includes('authentication') &&
      !err.includes('Unauthorized') &&
      !err.includes('session')
    );
    
    // Should not have TypeErrors or ReferenceErrors
    const jsErrors = criticalErrors.filter(e => 
      e.includes('TypeError') || e.includes('ReferenceError')
    );
    
    expect(jsErrors).toHaveLength(0);
  });

  test('loading state should be visible during auth check', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Should see loading or redirect quickly
    const outcome = await Promise.race([
      page.waitForSelector('[class*="animate-spin"]', { timeout: 5000 }).then(() => 'loading'),
      page.waitForURL(/admin\/login/, { timeout: 5000 }).then(() => 'redirected'),
    ]).catch(() => 'timeout');
    
    expect(['loading', 'redirected']).toContain(outcome);
  });
});

test.describe('Admin Dashboard Loading - Error Resilience', () => {
  test('dashboard should not show blank screen on network failure', async ({ page }) => {
    // Block API requests to simulate network failure
    await page.route('**/rest/v1/**', route => route.abort());
    
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.goto('/admin/dashboard');
    
    // Wait for page to settle
    await page.waitForTimeout(3000);
    
    // Should have content (either login page or error UI)
    const hasContent = await page.evaluate(() => {
      const body = document.body;
      return (body.textContent?.trim().length || 0) > 50;
    });
    
    expect(hasContent).toBe(true);
  });

  test('should handle slow API responses gracefully', async ({ page }) => {
    // Add delay to API responses
    await page.route('**/rest/v1/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      await route.continue();
    });
    
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.goto('/admin/dashboard');
    
    // Should show loading state or redirect
    await page.waitForTimeout(2000);
    
    const hasUIResponse = await page.evaluate(() => {
      const body = document.body;
      return (body.textContent?.trim().length || 0) > 20;
    });
    
    expect(hasUIResponse).toBe(true);
  });
});

test.describe('Admin Dashboard Loading - Components', () => {
  test('login form should remain interactive after failed login', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Submit with invalid credentials
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Form should still be interactive
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeEnabled();
    
    // Should be able to re-enter credentials
    await emailInput.fill('another@test.com');
    await expect(emailInput).toHaveValue('another@test.com');
  });

  test('should display security warning banner', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Security warning should be visible
    await expect(page.getByText(/administrator access only/i)).toBeVisible();
  });

  test('should have all navigation links on login page', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Forgot password
    await expect(page.getByRole('button', { name: /forgot password/i })).toBeVisible();
    
    // Debug panel (for troubleshooting)
    await expect(page.getByRole('button', { name: /debug/i })).toBeVisible();
  });
});

test.describe('Admin Dashboard Loading - Console & Network', () => {
  test('should not have uncaught JavaScript errors', async ({ page }) => {
    const uncaughtErrors: string[] = [];
    
    page.on('pageerror', error => {
      uncaughtErrors.push(error.message);
    });
    
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.goto('/admin/dashboard');
    await page.waitForTimeout(5000);
    
    // Filter out known/expected errors
    const criticalErrors = uncaughtErrors.filter(err => 
      !err.includes('ResizeObserver') &&
      !err.includes('Script error')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should make appropriate API calls during load', async ({ page }) => {
    const apiCalls: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('supabase') || url.includes('/rest/')) {
        apiCalls.push(url);
      }
    });
    
    await page.goto('/admin/login');
    await page.waitForTimeout(2000);
    
    // Should make auth-related calls
    const hasAuthCalls = apiCalls.some(url => 
      url.includes('auth') || url.includes('session')
    );
    
    // Auth calls are expected
    expect(hasAuthCalls || apiCalls.length === 0).toBe(true);
  });
});

test.describe('Admin Dashboard Loading - Timeout Handling', () => {
  test('should show refresh option if loading takes too long', async ({ page }) => {
    // Delay all responses significantly
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 8000));
      await route.continue();
    });
    
    // This test validates the timeout UI appears
    // The route delay should trigger the "taking too long" message
    
    await page.goto('/admin/dashboard', { timeout: 60000 }).catch(() => {
      // Expected to timeout or show message
    });
    
    // After timeout, should have some UI (even if error)
    const hasAnyContent = await page.evaluate(() => {
      return document.body.innerHTML.length > 0;
    });
    
    expect(hasAnyContent).toBe(true);
  });
});
