import { test, expect } from '@playwright/test';

test.describe('Site Navigation', () => {
  test('navigates from homepage to about page', async ({ page }) => {
    await page.goto('/');
    
    const aboutLink = page.getByRole('link', { name: /about/i }).first();
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await expect(page).toHaveURL(/\/about/);
    }
  });

  test('navigates from homepage to help center', async ({ page }) => {
    await page.goto('/');
    
    const helpLink = page.getByRole('link', { name: /help center/i });
    await helpLink.click();
    await expect(page).toHaveURL(/\/support\/help-center/);
  });

  test('navigates to educational games', async ({ page }) => {
    await page.goto('/');
    
    const gamesLink = page.getByRole('link', { name: /educational games/i });
    await gamesLink.click();
    await expect(page).toHaveURL(/\/features\/educational-games/);
  });

  test('navigates to privacy policy', async ({ page }) => {
    await page.goto('/');
    
    const privacyLink = page.getByRole('link', { name: /privacy policy/i });
    await privacyLink.click();
    await expect(page).toHaveURL(/\/support\/privacy-policy/);
  });

  test('navigates to terms of service', async ({ page }) => {
    await page.goto('/');
    
    const termsLink = page.getByRole('link', { name: /terms of service/i });
    await termsLink.click();
    await expect(page).toHaveURL(/\/support\/terms-of-service/);
  });

  test('404 page displays for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    
    await expect(page.getByText(/404|not found/i)).toBeVisible();
  });

  test('browser back button works correctly', async ({ page }) => {
    await page.goto('/');
    
    const helpLink = page.getByRole('link', { name: /help center/i });
    await helpLink.click();
    await expect(page).toHaveURL(/\/support\/help-center/);
    
    await page.goBack();
    await expect(page).toHaveURL('/');
  });
});
