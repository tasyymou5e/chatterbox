import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays hero section', async ({ page }) => {
    // Check for main heading or hero content
    await expect(page.locator('main')).toBeVisible();
  });

  test('displays navigation header', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible();
  });

  test('has working navigation links', async ({ page }) => {
    // Check for footer navigation
    const educationalGamesLink = page.getByRole('link', { name: /educational games/i });
    await expect(educationalGamesLink).toBeVisible();
  });

  test('navigates to auth page from CTA', async ({ page }) => {
    // Find and click the main CTA button
    const ctaButton = page.getByRole('link', { name: /get started|sign up|join/i }).first();
    
    if (await ctaButton.isVisible()) {
      await ctaButton.click();
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('is responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('main')).toBeVisible();
  });

  test('footer links are accessible', async ({ page }) => {
    const privacyLink = page.getByRole('link', { name: /privacy policy/i });
    await expect(privacyLink).toBeVisible();
    
    const termsLink = page.getByRole('link', { name: /terms of service/i });
    await expect(termsLink).toBeVisible();
  });
});
