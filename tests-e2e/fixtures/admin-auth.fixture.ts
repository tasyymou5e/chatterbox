import { test as base, Page, expect } from '@playwright/test';

/**
 * Admin Authentication fixtures for E2E tests
 * Provides pre-authenticated admin page context for protected admin routes
 */

export interface AdminAuthFixtures {
  adminPage: Page;
  cleanAdminPage: Page;
}

/**
 * Extended test with admin authentication fixtures
 */
export const test = base.extend<AdminAuthFixtures>({
  /**
   * Provides an authenticated admin page
   * Uses environment variables for credentials
   */
  adminPage: async ({ page }, use) => {
    // Navigate to admin login
    await page.goto('/admin/login');
    
    // Clear any existing session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    
    // Get admin test credentials from environment
    const adminEmail = process.env.ADMIN_TEST_EMAIL;
    const adminPassword = process.env.ADMIN_TEST_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.warn('Admin test credentials not set (ADMIN_TEST_EMAIL, ADMIN_TEST_PASSWORD). Skipping authentication.');
      await use(page);
      return;
    }
    
    // Fill in credentials
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for navigation to admin dashboard
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 }).catch(() => {
      console.warn('Admin authentication may have failed or redirected elsewhere');
    });
    
    await use(page);
  },

  /**
   * Provides a clean page with cleared storage (for testing unauthenticated flows)
   */
  cleanAdminPage: async ({ page }, use) => {
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await use(page);
  },
});

export { expect };
