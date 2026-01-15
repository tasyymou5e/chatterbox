import { test, expect } from '@playwright/test';

test.describe('Admin Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin login
    await page.goto('/admin/login');
  });

  test('should display admin login page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.getByText(/invalid|error|denied/i)).toBeVisible({ timeout: 5000 });
  });

  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.getByRole('link', { name: /forgot|reset/i });
    await expect(forgotLink).toBeVisible();
  });

  test('admin login page should be accessible', async ({ page }) => {
    // Check for basic accessibility
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login|submit/i })).toBeVisible();
  });
});

test.describe('Admin Navigation (Authenticated)', () => {
  // These tests would require authentication setup
  // For now, we test that the routes exist and redirect appropriately
  
  test('should redirect unauthenticated users from admin dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    
    // Should redirect to login or show access denied
    await expect(page).toHaveURL(/admin\/login|auth/);
  });

  test('should redirect unauthenticated users from admin users page', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Should redirect to login
    await expect(page).toHaveURL(/admin\/login|auth/);
  });

  test('should redirect unauthenticated users from admin families page', async ({ page }) => {
    await page.goto('/admin/families');
    
    // Should redirect to login
    await expect(page).toHaveURL(/admin\/login|auth/);
  });
});
