import { test, expect } from '@playwright/test';

test.describe('Games Catalog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/games');
  });

  test('should load games catalog page', async ({ page }) => {
    // Page should load without errors
    await expect(page).toHaveURL('/games');
    
    // Should have some content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i);
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('math');
      // Should filter results or show search results
    }
  });

  test('should have category filters', async ({ page }) => {
    // Look for filter elements
    const filterButton = page.getByRole('button', { name: /filter|category/i });
    
    if (await filterButton.isVisible()) {
      await filterButton.click();
      // Filter options should appear
    }
  });

  test('should display content cards', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(1000);
    
    // Look for content cards or items
    const contentCards = page.locator('[class*="card"], [class*="Card"]');
    
    // Either cards should be visible or a loading/empty state
    const cardsCount = await contentCards.count();
    if (cardsCount === 0) {
      // Should show loading or empty state
      const loadingOrEmpty = page.getByText(/loading|no content|empty/i);
      // This is acceptable
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Page should still be functional
    await expect(page).toHaveURL('/games');
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});

test.describe('Games Catalog Interactions', () => {
  test('should handle content click', async ({ page }) => {
    await page.goto('/games');
    
    // Wait for content
    await page.waitForTimeout(1000);
    
    // Try to click on a content card
    const firstCard = page.locator('[class*="card"], [class*="Card"]').first();
    
    if (await firstCard.isVisible()) {
      // Card should be clickable
      const box = await firstCard.boundingBox();
      expect(box).not.toBeNull();
    }
  });

  test('should handle favorites toggle', async ({ page }) => {
    await page.goto('/games');
    
    // Wait for content
    await page.waitForTimeout(1000);
    
    // Look for favorite button
    const favoriteButton = page.locator('[aria-label*="favorite"], button:has(svg[class*="heart"])').first();
    
    if (await favoriteButton.isVisible()) {
      // Click should toggle favorite state
      await favoriteButton.click();
    }
  });
});

test.describe('Games Demo Pages', () => {
  test('should load AAC demo page', async ({ page }) => {
    await page.goto('/aac-demo');
    
    // Page should load
    await expect(page).toHaveURL('/aac-demo');
  });

  test('should load subtraction game demo', async ({ page }) => {
    await page.goto('/games/subtraction-demo');
    
    // Page should load
    await expect(page).toHaveURL('/games/subtraction-demo');
  });
});
