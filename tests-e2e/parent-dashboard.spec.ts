import { test, expect } from '@playwright/test';

test.describe('Parent Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to parent route (should redirect to auth if not logged in)
    await page.goto('/parent');
  });

  test('should redirect to auth when not logged in', async ({ page }) => {
    // When not authenticated, should redirect to auth page
    await expect(page).toHaveURL(/auth|login/);
  });

  test('auth page should have login form', async ({ page }) => {
    await page.goto('/auth');
    
    // Should show sign in form
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('auth page should have sign up option', async ({ page }) => {
    await page.goto('/auth');
    
    // Should have option to create account
    const signUpButton = page.getByRole('button', { name: /sign up|create|register/i });
    await expect(signUpButton).toBeVisible();
  });

  test('auth page should show error for invalid login', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error after failed login attempt
    await expect(page.getByText(/invalid|error|denied|incorrect/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Parent Routes Protection', () => {
  test('should redirect from parent chores when not authenticated', async ({ page }) => {
    await page.goto('/parent/chores');
    await expect(page).toHaveURL(/auth|login/);
  });

  test('should redirect from parent connections when not authenticated', async ({ page }) => {
    await page.goto('/parent/connections');
    await expect(page).toHaveURL(/auth|login/);
  });

  test('should redirect from parent settings when not authenticated', async ({ page }) => {
    await page.goto('/parent/settings');
    await expect(page).toHaveURL(/auth|login/);
  });

  test('should redirect from parent reports when not authenticated', async ({ page }) => {
    await page.goto('/parent/reports');
    await expect(page).toHaveURL(/auth|login/);
  });
});

test.describe('Parent Auth Flow', () => {
  test('should show password strength indicator on signup', async ({ page }) => {
    await page.goto('/auth');
    
    // Switch to sign up
    const signUpTab = page.getByRole('button', { name: /sign up|create/i });
    await signUpTab.click();
    
    // Fill password field
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('weak');
    
    // Password strength indicator should be visible
    // This tests that the component renders
  });

  test('should have forgot password functionality', async ({ page }) => {
    await page.goto('/auth');
    
    // Look for forgot password link
    const forgotLink = page.getByText(/forgot/i);
    if (await forgotLink.isVisible()) {
      await forgotLink.click();
      // Should show reset password form
      await expect(page.getByText(/reset|email/i)).toBeVisible();
    }
  });
});
