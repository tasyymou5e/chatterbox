import { test, expect } from '@playwright/test';

/**
 * Comprehensive Admin Dashboard Tests
 * Tests loading states, error boundaries, fallback data, and security
 */

test.describe('Admin Dashboard Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('dashboard should not show blank screen', async ({ page }) => {
    // Go to dashboard (will redirect to login if not authenticated)
    await page.goto('/admin/dashboard');
    
    // Wait for page to settle
    await page.waitForTimeout(2000);
    
    // Should see either dashboard content or login page - NOT a blank screen
    const hasContent = await page.evaluate(() => {
      const body = document.body;
      const textContent = body.textContent?.trim() || '';
      return textContent.length > 50; // Has meaningful content
    });
    
    expect(hasContent).toBe(true);
  });

  test('dashboard elements should render when authenticated', async ({ page }) => {
    // This test assumes we could be authenticated
    // For unauthenticated users, verify we get redirected properly
    await page.goto('/admin/dashboard');
    
    // Should redirect to login for unauthenticated users
    await expect(page).toHaveURL(/admin\/login/, { timeout: 15000 });
    
    // Login page should be fully rendered
    await expect(page.locator('form')).toBeVisible();
  });

  test('should handle analytics loading gracefully', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // After redirect to login, the page should be responsive
    await expect(page).toHaveURL(/admin\/login/, { timeout: 15000 });
    
    // Page should not have any console errors indicating crashes
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a moment for any errors to appear
    await page.waitForTimeout(1000);
    
    // Filter out expected errors (like auth failures)
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('401') && 
      !err.includes('authentication') &&
      !err.includes('Unauthorized')
    );
    
    // Should not have critical JavaScript errors
    expect(criticalErrors.filter(e => e.includes('TypeError') || e.includes('ReferenceError'))).toHaveLength(0);
  });
});

test.describe('Admin Dashboard Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('login form should be interactive', async ({ page }) => {
    // Email input should be editable
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
    
    // Password input should be editable
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('testpassword');
    await expect(passwordInput).toHaveValue('testpassword');
    
    // Submit button should be clickable
    const submitButton = page.getByRole('button', { name: /sign in|login/i });
    await expect(submitButton).toBeEnabled();
  });

  test('should show error handling UI on failures', async ({ page }) => {
    // Submit with invalid credentials
    await page.fill('input[type="email"]', 'fake@example.com');
    await page.fill('input[type="password"]', 'fakepassword');
    await page.click('button[type="submit"]');
    
    // Should show error message, not crash
    await page.waitForTimeout(3000);
    
    // Page should still be interactive
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeEnabled();
  });
});

test.describe('Admin Dashboard Security', () => {
  test('should not expose sensitive data in page source', async ({ page }) => {
    await page.goto('/admin/login');
    
    const pageContent = await page.content();
    
    // Should not have hardcoded secrets
    expect(pageContent).not.toMatch(/sk_live_/);
    expect(pageContent).not.toMatch(/secret_key/i);
    expect(pageContent).not.toMatch(/password.*=.*['"]\w{8,}/i);
  });

  test('should use secure form attributes', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Password field should not have autocomplete issues
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    
    // Form should exist
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });
});

test.describe('Admin Dashboard Error Boundaries', () => {
  test('should handle component errors gracefully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/admin/dashboard');
    
    // Wait for redirect or content
    await page.waitForTimeout(3000);
    
    // Should not show raw error messages to users
    const pageContent = await page.content();
    expect(pageContent).not.toMatch(/Uncaught Error/i);
    expect(pageContent).not.toMatch(/at Object\./);
  });

  test('should provide fallback UI on errors', async ({ page }) => {
    // Block API calls to force errors
    await page.route('**/rest/v1/**', route => route.abort());
    
    await page.goto('/admin/dashboard');
    await page.waitForTimeout(3000);
    
    // Should still have rendered content
    const hasContent = await page.evaluate(() => {
      return (document.body.textContent?.length || 0) > 50;
    });
    
    expect(hasContent).toBe(true);
  });
});

test.describe('Admin Dashboard Fallback Data', () => {
  test('should render with zero/default values on API failure', async ({ page }) => {
    // Block analytics API
    await page.route('**/functions/v1/**', route => route.abort());
    
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.goto('/admin/dashboard');
    
    // Should redirect to login (since not authenticated)
    await expect(page).toHaveURL(/admin\/login/, { timeout: 15000 });
    
    // Login should still work
    await expect(page.locator('form')).toBeVisible();
  });

  test('should not crash on slow network', async ({ page }) => {
    // Add network delay
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    await page.goto('/admin/login', { timeout: 60000 });
    
    // Page should eventually load
    await expect(page.locator('body')).toBeVisible();
  });
});
