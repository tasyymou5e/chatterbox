import { test, expect } from '@playwright/test';

test.describe('Authentication Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('displays authentication form', async ({ page }) => {
    await expect(page.locator('form')).toBeVisible();
  });

  test('has sign up and sign in tabs', async ({ page }) => {
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    const signInTab = page.getByRole('tab', { name: /sign in/i });
    
    await expect(signUpTab).toBeVisible();
    await expect(signInTab).toBeVisible();
  });

  test('can switch between tabs', async ({ page }) => {
    const signInTab = page.getByRole('tab', { name: /sign in/i });
    await signInTab.click();
    
    await expect(signInTab).toHaveAttribute('data-state', 'active');
  });

  test('shows validation errors for empty form submission', async ({ page }) => {
    // Switch to sign in tab
    await page.getByRole('tab', { name: /sign in/i }).click();
    
    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();
    
    // Check for validation message (browser native or custom)
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('email input accepts valid email format', async ({ page }) => {
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('test@example.com');
    
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(true);
  });

  test('password input masks characters', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('forgot password link is visible on sign in', async ({ page }) => {
    await page.getByRole('tab', { name: /sign in/i }).click();
    
    const forgotPasswordLink = page.getByText(/forgot password/i);
    await expect(forgotPasswordLink).toBeVisible();
  });

  test('is accessible via keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    
    // Check that focus moves through interactive elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A', 'TAB']).toContain(focusedElement);
  });
});
