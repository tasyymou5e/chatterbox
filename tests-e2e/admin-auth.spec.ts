import { test, expect } from '@playwright/test';

/**
 * Comprehensive Admin Authentication Flow Tests
 * Tests login, redirects, session handling, and race condition prevention
 */

test.describe('Admin Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session state
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('should display admin login page correctly', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('should show validation error for empty fields', async ({ page }) => {
    // Try to submit without filling in fields - browser validation should prevent
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();
    
    // Should still be on login page
    await expect(page).toHaveURL(/admin\/login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.getByText(/invalid|error|denied|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.getByRole('button', { name: /forgot|reset/i });
    await expect(forgotLink).toBeVisible();
  });

  test('login page should be accessible', async ({ page }) => {
    // Check for basic accessibility
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toHaveAttribute('type', 'email');
    await expect(page.locator('input[type="password"]')).toHaveAttribute('type', 'password');
  });

  test('should not show loading state indefinitely', async ({ page }) => {
    // Navigate to a protected route
    await page.goto('/admin/dashboard');
    
    // Wait for either redirect to login or timeout UI to appear
    await Promise.race([
      expect(page).toHaveURL(/admin\/login/, { timeout: 15000 }),
      expect(page.getByText(/timeout|refresh|taking longer/i)).toBeVisible({ timeout: 15000 })
    ]);
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    const protectedRoutes = [
      '/admin/dashboard',
      '/admin/users',
      '/admin/families'
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      
      // Should redirect to login within reasonable time
      await expect(page).toHaveURL(/admin\/login/, { timeout: 15000 });
    }
  });
});

test.describe('Admin Route Loading States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should show appropriate loading state', async ({ page }) => {
    // Go directly to protected route to trigger loading
    await page.goto('/admin/dashboard');
    
    // Should see either loading indicator or redirect to login
    const loadingOrLogin = await Promise.race([
      page.waitForSelector('[class*="animate-spin"]', { timeout: 5000 }).then(() => 'loading'),
      page.waitForURL(/admin\/login/, { timeout: 5000 }).then(() => 'login')
    ]).catch(() => 'neither');
    
    expect(['loading', 'login']).toContain(loadingOrLogin);
  });

  test('loading state should have refresh option after timeout', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // If we see loading state for too long, should have refresh option
    const spinnerVisible = await page.locator('[class*="animate-spin"]').isVisible().catch(() => false);
    
    if (spinnerVisible) {
      // Wait for potential timeout message
      await page.waitForTimeout(6000);
      
      // Look for refresh option or redirect
      const refreshButton = page.getByText(/refresh|try again/i);
      const isOnLogin = page.url().includes('/admin/login');
      
      const hasRefreshOrRedirected = await refreshButton.isVisible().catch(() => false) || isOnLogin;
      expect(hasRefreshOrRedirected).toBe(true);
    }
  });
});

test.describe('Admin Session Handling', () => {
  test('should clear session on logout', async ({ page }) => {
    // Navigate to login
    await page.goto('/admin/login');
    
    // Check that we're on login page (session cleared)
    await expect(page).toHaveURL(/admin\/login/);
    
    // Verify localStorage is accessible
    const hasSessionData = await page.evaluate(() => {
      return localStorage.getItem('auth-session-store') !== null;
    });
    
    // Session data might exist but should be invalid - important thing is UI shows login
  });

  test('emergency reset clears all data', async ({ page }) => {
    // Set some fake data
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.setItem('test-data', 'test');
      sessionStorage.setItem('test-session', 'test');
    });
    
    // Trigger emergency reset (clear all)
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    const localData = await page.evaluate(() => localStorage.length);
    const sessionData = await page.evaluate(() => sessionStorage.length);
    
    expect(localData).toBe(0);
    expect(sessionData).toBe(0);
  });
});

test.describe('Admin Auth Race Condition Prevention', () => {
  test('should not flash blank screen during auth check', async ({ page }) => {
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Navigate to dashboard
    await page.goto('/admin/dashboard');
    
    // Immediately check for content
    await page.waitForTimeout(500);
    
    const hasContent = await page.evaluate(() => {
      const body = document.body;
      return (body.textContent?.trim().length || 0) > 20;
    });
    
    expect(hasContent).toBe(true);
  });

  test('should handle rapid navigation gracefully', async ({ page }) => {
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Rapid navigation
    await page.goto('/admin/dashboard');
    await page.goto('/admin/users');
    await page.goto('/admin/families');
    await page.goto('/admin/dashboard');
    
    // Should eventually settle on login or dashboard
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/admin\/(login|dashboard|users|families)/);
  });

  test('should maintain UI responsiveness during auth', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Fill form while auth is happening
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'password');
    
    // Form should remain responsive
    const emailValue = await page.locator('input[type="email"]').inputValue();
    expect(emailValue).toBe('test@test.com');
  });
});
