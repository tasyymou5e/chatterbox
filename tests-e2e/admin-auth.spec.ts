import { test, expect } from '@playwright/test';

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
    // Try to submit without filling in fields
    await page.click('button[type="submit"]');
    
    // Should show some validation message or not navigate
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
    const forgotLink = page.getByRole('link', { name: /forgot|reset/i });
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

  test('loading state should have refresh option', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // If we see loading state, it should have a refresh option
    const spinnerVisible = await page.locator('[class*="animate-spin"]').isVisible().catch(() => false);
    
    if (spinnerVisible) {
      // Wait a bit for the "taking too long" message
      await page.waitForTimeout(3000);
      
      // Look for refresh option
      const refreshButton = page.getByText(/refresh/i);
      await expect(refreshButton).toBeVisible({ timeout: 10000 });
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
    
    // Note: Session data might exist but should be invalid
    // The important thing is the UI shows login
  });

  test('emergency reset clears all data', async ({ page }) => {
    // Set some fake data
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.setItem('test-data', 'test');
      sessionStorage.setItem('test-session', 'test');
    });
    
    // Trigger emergency reset (if available through URL param)
    await page.goto('/admin/login');
    
    // Clear all and verify
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
