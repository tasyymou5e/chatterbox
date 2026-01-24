import { test, expect } from '@playwright/test';
import {
  captureFormScreenshot,
  captureElementScreenshot,
  waitForStableUI,
  mockAuthError,
  mockSlowAuthResponse,
  mockPinRequiredResponse,
  mockLockedAccountResponse,
  fillSignInForm,
  fillSignUpForm,
  triggerRateLimitLockout,
} from './fixtures/visual-utils';

/**
 * Visual Regression Tests for Authentication UI
 * 
 * These tests capture screenshots of authentication forms in various states
 * and compare them against baseline images to detect unintended UI changes.
 * 
 * To update baselines: npx playwright test auth-visual.spec.ts --update-snapshots
 * To run tests: npx playwright test auth-visual.spec.ts
 */

// ============================================================================
// SIGN-IN FORM VISUAL TESTS
// ============================================================================

test.describe('Visual Regression - Sign-In Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: /sign in/i }).click();
    await waitForStableUI(page);
  });

  test('default state', async ({ page }) => {
    await captureFormScreenshot(page, 'signin-default');
  });

  test('filled state', async ({ page }) => {
    await fillSignInForm(page, 'test@example.com', '••••••••');
    await captureFormScreenshot(page, 'signin-filled');
  });

  test('loading state', async ({ page }) => {
    await mockSlowAuthResponse(page, 30000);
    
    await fillSignInForm(page, 'test@example.com', 'password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Capture immediately after click to show spinner
    await page.waitForTimeout(100);
    await captureFormScreenshot(page, 'signin-loading');
  });

  test('validation error - empty email', async ({ page }) => {
    await page.fill('#signin-password', 'password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await waitForStableUI(page);
    await captureFormScreenshot(page, 'signin-validation-empty-email');
  });

  test('error toast after failed login', async ({ page }) => {
    await mockAuthError(page, 'Invalid login credentials');
    
    await fillSignInForm(page, 'test@example.com', 'wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for toast to appear
    await page.waitForSelector('[role="status"], [data-sonner-toast]', { timeout: 5000 }).catch(() => {});
    await waitForStableUI(page, 500);
    
    await captureFormScreenshot(page, 'signin-error-toast', { fullPage: true });
  });
});

// ============================================================================
// SIGN-UP FORM VISUAL TESTS
// ============================================================================

test.describe('Visual Regression - Sign-Up Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    // Sign up tab should be default, but ensure we're on it
    await waitForStableUI(page);
  });

  test('default state', async ({ page }) => {
    await captureFormScreenshot(page, 'signup-default');
  });

  test('filled state', async ({ page }) => {
    await fillSignUpForm(page, 'John', 'Doe', 'john@example.com', 'SecurePass123!');
    await captureFormScreenshot(page, 'signup-filled');
  });
});

// ============================================================================
// PASSWORD STRENGTH INDICATOR VISUAL TESTS
// ============================================================================

test.describe('Visual Regression - Password Strength', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    // Ensure we're on sign up tab
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    if (await signUpTab.isVisible()) {
      await signUpTab.click();
    }
    await waitForStableUI(page);
  });

  test('weak password indicator', async ({ page }) => {
    await page.fill('#signup-password', 'weak');
    await waitForStableUI(page, 300);
    
    await captureElementScreenshot(
      page,
      '[data-testid="password-strength"]',
      'password-strength-weak'
    );
  });

  test('medium password indicator', async ({ page }) => {
    await page.fill('#signup-password', 'Medium123');
    await waitForStableUI(page, 300);
    
    await captureElementScreenshot(
      page,
      '[data-testid="password-strength"]',
      'password-strength-medium'
    );
  });

  test('strong password indicator', async ({ page }) => {
    await page.fill('#signup-password', 'V3ryStr0ng!Pass#2024');
    await waitForStableUI(page, 300);
    
    await captureElementScreenshot(
      page,
      '[data-testid="password-strength"]',
      'password-strength-strong'
    );
  });

  test('requirements checklist - partial', async ({ page }) => {
    await page.fill('#signup-password', 'short1');
    await waitForStableUI(page, 300);
    
    await captureElementScreenshot(
      page,
      '[data-testid="password-strength"]',
      'password-requirements-partial'
    );
  });
});

// ============================================================================
// CHILD SIGNUP FORM VISUAL TESTS
// ============================================================================

test.describe('Visual Regression - Child Signup', () => {
  test('default child-friendly form', async ({ page }) => {
    await page.goto('/auth?tab=child-signup');
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'child-signup-default');
  });

  test('PIN verification visible', async ({ page }) => {
    await mockPinRequiredResponse(page);
    
    await page.goto('/auth?tab=child-signup');
    await waitForStableUI(page);
    
    await page.fill('#account-code', 'TESTCODE123');
    await page.fill('#child-password', 'SecurePass123!');
    await page.fill('#child-confirm-password', 'SecurePass123!');
    await page.getByRole('button', { name: /complete/i }).click();
    
    // Wait for PIN input to appear
    await page.waitForSelector('#verification-pin', { timeout: 5000 }).catch(() => {});
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'child-signup-pin-required');
  });

  test('locked account state', async ({ page }) => {
    await mockLockedAccountResponse(page);
    
    await page.goto('/auth?tab=child-signup');
    await waitForStableUI(page);
    
    await page.fill('#account-code', 'LOCKEDCODE');
    await page.fill('#child-password', 'Password123!');
    await page.fill('#child-confirm-password', 'Password123!');
    await page.getByRole('button', { name: /complete/i }).click();
    
    await waitForStableUI(page, 500);
    
    await captureFormScreenshot(page, 'child-signup-locked', {
      mask: ['[data-testid="lock-timer"]'],
    });
  });

  test('password strength in child form', async ({ page }) => {
    await page.goto('/auth?tab=child-signup');
    await waitForStableUI(page);
    
    await page.fill('#child-password', 'StrongChildPass123!');
    await waitForStableUI(page, 300);
    
    await captureFormScreenshot(page, 'child-signup-with-strength');
  });
});

// ============================================================================
// ADMIN LOGIN VISUAL TESTS
// ============================================================================

test.describe('Visual Regression - Admin Login', () => {
  test('default state with warning banner', async ({ page }) => {
    await page.goto('/admin/login');
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'admin-login-default');
  });

  test('filled state', async ({ page }) => {
    await page.goto('/admin/login');
    await waitForStableUI(page);
    
    await page.fill('input[type="email"]', 'admin@chatterbox.life');
    await page.fill('input[type="password"]', '••••••••••');
    
    await captureFormScreenshot(page, 'admin-login-filled');
  });

  test('lockout alert visible', async ({ page }) => {
    await page.goto('/admin/login');
    await waitForStableUI(page);
    
    // Trigger rate limit by submitting multiple failed attempts
    await mockAuthError(page, 'Invalid credentials');
    
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(300);
    }
    
    await waitForStableUI(page, 500);
    
    await captureFormScreenshot(page, 'admin-login-lockout-alert', {
      mask: ['[data-testid="lockout-timer"]'],
    });
  });

  test('rate limit warning banner', async ({ page }) => {
    await page.goto('/admin/login');
    await waitForStableUI(page);
    
    await mockAuthError(page, 'Invalid credentials');
    
    // Trigger 3 failed attempts to show warning (before full lockout)
    for (let i = 0; i < 3; i++) {
      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'wrong');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(500);
    }
    
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'admin-login-rate-warning');
  });
});

// ============================================================================
// FORGOT PASSWORD VISUAL TESTS
// ============================================================================

test.describe('Visual Regression - Forgot Password', () => {
  test('default state', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: /sign in/i }).click();
    await page.getByText(/forgot your password/i).click();
    
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'forgot-password-default');
  });

  test('filled state', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: /sign in/i }).click();
    await page.getByText(/forgot your password/i).click();
    
    await waitForStableUI(page);
    await page.fill('input[type="email"]', 'user@example.com');
    
    await captureFormScreenshot(page, 'forgot-password-filled');
  });

  test('success message', async ({ page }) => {
    // Mock successful password reset request
    await page.route('**/auth/v1/recover*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
    
    await page.goto('/auth');
    await page.getByRole('tab', { name: /sign in/i }).click();
    await page.getByText(/forgot your password/i).click();
    
    await waitForStableUI(page);
    await page.fill('input[type="email"]', 'user@example.com');
    await page.getByRole('button', { name: /send reset/i }).click();
    
    await waitForStableUI(page, 500);
    
    await captureFormScreenshot(page, 'forgot-password-success', { fullPage: true });
  });
});

// ============================================================================
// RESPONSIVE VISUAL TESTS - MOBILE
// ============================================================================

test.describe('Visual Regression - Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone 12

  test('signin form mobile layout', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: /sign in/i }).click();
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'signin-mobile', { fullPage: true });
  });

  test('signup form mobile layout', async ({ page }) => {
    await page.goto('/auth');
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'signup-mobile', { fullPage: true });
  });

  test('admin login mobile layout', async ({ page }) => {
    await page.goto('/admin/login');
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'admin-login-mobile', { fullPage: true });
  });
});

// ============================================================================
// RESPONSIVE VISUAL TESTS - TABLET
// ============================================================================

test.describe('Visual Regression - Tablet Responsive', () => {
  test.use({ viewport: { width: 768, height: 1024 } }); // iPad

  test('signup form tablet layout', async ({ page }) => {
    await page.goto('/auth');
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'signup-tablet', { fullPage: true });
  });

  test('child signup tablet layout', async ({ page }) => {
    await page.goto('/auth?tab=child-signup');
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'child-signup-tablet', { fullPage: true });
  });
});

// ============================================================================
// DARK MODE VISUAL TESTS (if theme switching is available)
// ============================================================================

test.describe('Visual Regression - Theme States', () => {
  test('signin form in dark mode', async ({ page }) => {
    await page.goto('/auth');
    
    // Set dark mode via localStorage or class
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    
    await page.reload();
    await page.getByRole('tab', { name: /sign in/i }).click();
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'signin-dark-mode');
  });

  test('admin login in dark mode', async ({ page }) => {
    await page.goto('/admin/login');
    
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    
    await page.reload();
    await waitForStableUI(page);
    
    await captureFormScreenshot(page, 'admin-login-dark-mode');
  });
});
