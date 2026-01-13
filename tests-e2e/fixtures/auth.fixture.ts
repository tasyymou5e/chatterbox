import { test as base, Page } from '@playwright/test';

/**
 * Authentication fixtures for E2E tests
 * Provides pre-authenticated page context for protected routes
 */

export interface AuthFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to auth page
    await page.goto('/auth?tab=signin');
    
    // Get test credentials from environment
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;
    
    if (!testEmail || !testPassword) {
      console.warn('Test credentials not set. Skipping authentication.');
      await use(page);
      return;
    }
    
    // Fill in credentials
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for navigation to dashboard
    await page.waitForURL(/\/(parent|children|admin)/, { timeout: 10000 }).catch(() => {
      console.warn('Authentication may have failed or redirected elsewhere');
    });
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
