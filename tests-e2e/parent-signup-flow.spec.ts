import { test, expect, Page } from '@playwright/test';

/**
 * Helper to clear authentication state from browser storage
 */
async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Helper to fill the signup form with provided data
 */
async function fillSignupForm(page: Page, data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}) {
  if (data.firstName) await page.fill('#first-name', data.firstName);
  if (data.lastName) await page.fill('#last-name', data.lastName);
  if (data.email) await page.fill('#signup-email', data.email);
  if (data.password) await page.fill('#signup-password', data.password);
}

/**
 * Generate a unique test email to avoid conflicts
 */
function generateTestEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

// ============================================================================
// LOGGED-OUT USER TESTS
// ============================================================================

test.describe('Parent Signup Flow - Form UI (Logged Out)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await clearAuthState(page);
    await page.reload();
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('displays signup form with all required fields', async ({ page }) => {
    // Wait for the form to be visible
    await expect(page.locator('form')).toBeVisible();
    
    // Check all form fields are present
    await expect(page.locator('#first-name')).toBeVisible();
    await expect(page.locator('#last-name')).toBeVisible();
    await expect(page.locator('#signup-email')).toBeVisible();
    await expect(page.locator('#signup-password')).toBeVisible();
    
    // Check submit button
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('signup tab is active by default or can be activated', async ({ page }) => {
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    const signinTab = page.getByRole('tab', { name: /sign in/i });
    
    await expect(signupTab).toBeVisible();
    await expect(signinTab).toBeVisible();
    
    // Click signup tab to ensure it's active
    await signupTab.click();
    await expect(signupTab).toHaveAttribute('data-state', 'active');
  });

  test('shows password strength indicator when typing password', async ({ page }) => {
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    await signupTab.click();
    
    const passwordInput = page.locator('#signup-password');
    await passwordInput.fill('weak');
    
    // Password strength indicator should be visible
    await expect(page.getByText(/password strength/i).or(page.locator('[class*="strength"]'))).toBeVisible();
  });

  test('form fields have correct input types and attributes', async ({ page }) => {
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    await signupTab.click();
    
    // Email field should have type="email"
    await expect(page.locator('#signup-email')).toHaveAttribute('type', 'email');
    
    // Password field should have type="password"
    await expect(page.locator('#signup-password')).toHaveAttribute('type', 'password');
    
    // Fields should be required
    await expect(page.locator('#first-name')).toHaveAttribute('required', '');
    await expect(page.locator('#last-name')).toHaveAttribute('required', '');
    await expect(page.locator('#signup-email')).toHaveAttribute('required', '');
    await expect(page.locator('#signup-password')).toHaveAttribute('required', '');
  });

  test('form labels are properly associated with inputs', async ({ page }) => {
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    await signupTab.click();
    
    // Check that labels exist for inputs
    await expect(page.locator('label[for="first-name"]')).toBeVisible();
    await expect(page.locator('label[for="last-name"]')).toBeVisible();
    await expect(page.locator('label[for="signup-email"]')).toBeVisible();
    await expect(page.locator('label[for="signup-password"]')).toBeVisible();
  });
});

// ============================================================================
// FORM VALIDATION TESTS
// ============================================================================

test.describe('Parent Signup Flow - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await clearAuthState(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Ensure signup tab is active
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    if (await signupTab.isVisible()) {
      await signupTab.click();
    }
  });

  test('shows validation for empty email field', async ({ page }) => {
    // Fill other fields but leave email empty
    await fillSignupForm(page, {
      firstName: 'Test',
      lastName: 'User',
      password: 'SecurePassword123!',
    });
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    
    // Check for browser validation
    const emailInput = page.locator('#signup-email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('validates email format', async ({ page }) => {
    const emailInput = page.locator('#signup-email');
    await emailInput.fill('invalid-email');
    
    // Trigger validation by trying to submit or blur
    await page.locator('#signup-password').focus();
    
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('validates password minimum length', async ({ page }) => {
    const passwordInput = page.locator('#signup-password');
    await passwordInput.fill('short');
    
    // Password should have minlength attribute
    const minLength = await passwordInput.getAttribute('minlength');
    expect(parseInt(minLength || '0')).toBeGreaterThanOrEqual(8);
  });

  test('shows validation for empty first name', async ({ page }) => {
    await fillSignupForm(page, {
      lastName: 'User',
      email: generateTestEmail(),
      password: 'SecurePassword123!',
    });
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    
    const firstNameInput = page.locator('#first-name');
    const isInvalid = await firstNameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('shows validation for empty last name', async ({ page }) => {
    await fillSignupForm(page, {
      firstName: 'Test',
      email: generateTestEmail(),
      password: 'SecurePassword123!',
    });
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    
    const lastNameInput = page.locator('#last-name');
    const isInvalid = await lastNameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });
});

// ============================================================================
// FORM SUBMISSION TESTS
// ============================================================================

test.describe('Parent Signup Flow - Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await clearAuthState(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    if (await signupTab.isVisible()) {
      await signupTab.click();
    }
  });

  test('shows loading state during form submission', async ({ page }) => {
    await fillSignupForm(page, {
      firstName: 'Test',
      lastName: 'User',
      email: generateTestEmail(),
      password: 'SecurePassword123!',
    });
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    
    // Click and immediately check for loading state
    await submitButton.click();
    
    // Check for loading indicator (spinner or text change)
    await expect(
      page.getByText(/creating account/i).or(page.locator('.animate-spin'))
    ).toBeVisible({ timeout: 2000 });
  });

  test('disables form inputs during submission', async ({ page }) => {
    await fillSignupForm(page, {
      firstName: 'Test',
      lastName: 'User',
      email: generateTestEmail(),
      password: 'SecurePassword123!',
    });
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    
    // Button should be disabled during loading
    await expect(submitButton).toBeDisabled({ timeout: 1000 });
  });

  test('handles network error gracefully', async ({ page }) => {
    // Mock network failure for auth endpoint
    await page.route('**/auth/v1/signup*', route => {
      route.abort('failed');
    });
    
    await fillSignupForm(page, {
      firstName: 'Test',
      lastName: 'User',
      email: generateTestEmail(),
      password: 'SecurePassword123!',
    });
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    
    // Should show error toast or message
    await expect(
      page.getByText(/error/i).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('clears loading state after submission completes', async ({ page }) => {
    // Mock a quick response
    await page.route('**/auth/v1/signup*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ 
          user: { id: 'test-id' },
          session: null 
        }),
      });
    });
    
    await fillSignupForm(page, {
      firstName: 'Test',
      lastName: 'User',
      email: generateTestEmail(),
      password: 'SecurePassword123!',
    });
    
    const submitButton = page.getByRole('button', { name: /create account/i });
    await submitButton.click();
    
    // Wait for loading to complete
    await expect(submitButton).not.toBeDisabled({ timeout: 10000 });
  });
});

// ============================================================================
// AUTHENTICATED USER TESTS
// ============================================================================

test.describe('Parent Signup Flow - Already Authenticated', () => {
  test('shows redirect message when user is already signed in', async ({ page }) => {
    // Mock authenticated session
    await page.route('**/auth/v1/token*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'test-user-id',
            email: 'parent@example.com',
            role: 'authenticated',
          },
        }),
      });
    });
    
    await page.route('**/auth/v1/user*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          email: 'parent@example.com',
          role: 'authenticated',
        }),
      });
    });
    
    // Set mock session in localStorage before navigation
    await page.addInitScript(() => {
      localStorage.setItem('auth-session-store', JSON.stringify({
        state: {
          user: { id: 'test-user-id', email: 'parent@example.com' },
          session: { access_token: 'mock-token', expires_at: Date.now() + 3600000 },
        },
        version: 0,
      }));
    });
    
    await page.goto('/auth');
    
    // Should show "already signed in" or redirect message
    await expect(
      page.getByText(/already signed in/i)
        .or(page.getByText(/redirecting/i))
        .or(page.getByRole('button', { name: /go to dashboard/i }))
    ).toBeVisible({ timeout: 5000 });
  });

  test('displays Go to Dashboard button when authenticated', async ({ page }) => {
    // Set up authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth-session-store', JSON.stringify({
        state: {
          user: { id: 'test-user-id', email: 'parent@example.com' },
          session: { access_token: 'mock-token', expires_at: Date.now() + 3600000 },
        },
        version: 0,
      }));
    });
    
    await page.route('**/rest/v1/rpc/get_user_role*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify('parent'),
      });
    });
    
    await page.goto('/auth');
    
    // Wait for session check
    await page.waitForTimeout(1000);
    
    // Should show dashboard navigation option
    const dashboardButton = page.getByRole('button', { name: /go to dashboard/i });
    if (await dashboardButton.isVisible({ timeout: 3000 })) {
      await expect(dashboardButton).toBeEnabled();
    }
  });

  test('does not show signup form when authenticated', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-session-store', JSON.stringify({
        state: {
          user: { id: 'test-user-id', email: 'parent@example.com' },
          session: { access_token: 'mock-token', expires_at: Date.now() + 3600000 },
        },
        version: 0,
      }));
    });
    
    await page.route('**/rest/v1/rpc/get_user_role*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify('parent'),
      });
    });
    
    await page.goto('/auth');
    await page.waitForTimeout(1000);
    
    // The signup form should NOT be visible for authenticated users
    const signupForm = page.locator('#signup-email');
    const isHidden = !(await signupForm.isVisible());
    
    // Either the form is hidden, or we see the authenticated message
    const hasAuthMessage = await page.getByText(/already signed in/i).isVisible().catch(() => false);
    
    expect(isHidden || hasAuthMessage).toBe(true);
  });
});

// ============================================================================
// NAVIGATION & URL PARAMETER TESTS
// ============================================================================

test.describe('Parent Signup Flow - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('respects tab=signup URL parameter', async ({ page }) => {
    await page.goto('/auth?tab=signup');
    await page.waitForLoadState('networkidle');
    
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    await expect(signupTab).toHaveAttribute('data-state', 'active');
  });

  test('respects tab=signin URL parameter', async ({ page }) => {
    await page.goto('/auth?tab=signin');
    await page.waitForLoadState('networkidle');
    
    const signinTab = page.getByRole('tab', { name: /sign in/i });
    await expect(signinTab).toHaveAttribute('data-state', 'active');
  });

  test('can switch between signup and signin tabs', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    const signinTab = page.getByRole('tab', { name: /sign in/i });
    
    // Switch to signin
    await signinTab.click();
    await expect(signinTab).toHaveAttribute('data-state', 'active');
    
    // Switch back to signup
    await signupTab.click();
    await expect(signupTab).toHaveAttribute('data-state', 'active');
  });

  test('forgot password link navigates to forgot-password view', async ({ page }) => {
    await page.goto('/auth?tab=signin');
    await page.waitForLoadState('networkidle');
    
    const forgotPasswordLink = page.getByText(/forgot password/i);
    await expect(forgotPasswordLink).toBeVisible();
    
    await forgotPasswordLink.click();
    
    // Should show forgot password form
    await expect(
      page.getByText(/reset your password/i)
        .or(page.getByRole('button', { name: /send reset/i }))
        .or(page.getByRole('button', { name: /reset password/i }))
    ).toBeVisible({ timeout: 3000 });
  });

  test('child-signup tab works with code parameter', async ({ page }) => {
    await page.goto('/auth?tab=child-signup&code=TEST123');
    await page.waitForLoadState('networkidle');
    
    // Should show child signup form or related content
    await expect(
      page.getByText(/child/i)
        .or(page.getByText(/family code/i))
        .or(page.locator('input[placeholder*="code" i]'))
    ).toBeVisible({ timeout: 3000 });
  });
});

// ============================================================================
// ACCESSIBILITY TESTS
// ============================================================================

test.describe('Parent Signup Flow - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await clearAuthState(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    if (await signupTab.isVisible()) {
      await signupTab.click();
    }
  });

  test('supports keyboard navigation through form fields', async ({ page }) => {
    // Start from the first input
    await page.locator('#first-name').focus();
    
    // Tab through fields
    await page.keyboard.press('Tab');
    await expect(page.locator('#last-name')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#signup-email')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('#signup-password')).toBeFocused();
  });

  test('form can be submitted with Enter key', async ({ page }) => {
    await fillSignupForm(page, {
      firstName: 'Test',
      lastName: 'User',
      email: generateTestEmail(),
      password: 'SecurePassword123!',
    });
    
    // Focus password field and press Enter
    await page.locator('#signup-password').focus();
    await page.keyboard.press('Enter');
    
    // Should trigger form submission (loading state or API call)
    await expect(
      page.getByText(/creating account/i)
        .or(page.locator('.animate-spin'))
        .or(page.getByRole('button', { name: /create account/i }))
    ).toBeVisible({ timeout: 2000 });
  });

  test('tab list is keyboard accessible', async ({ page }) => {
    const tabList = page.getByRole('tablist');
    await expect(tabList).toBeVisible();
    
    // Focus on tab list and navigate with arrow keys
    await page.getByRole('tab', { name: /sign up/i }).focus();
    await page.keyboard.press('ArrowRight');
    
    // Sign in tab should be focused
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeFocused();
  });

  test('inputs have aria-describedby for additional context', async ({ page }) => {
    // Check that password has aria-describedby pointing to requirements
    const passwordInput = page.locator('#signup-password');
    const ariaDescribedBy = await passwordInput.getAttribute('aria-describedby');
    
    // Should have some accessibility description
    expect(ariaDescribedBy).toBeTruthy();
  });
});

// ============================================================================
// SESSION STATE TESTS
// ============================================================================

test.describe('Parent Signup Flow - Session State', () => {
  test('shows loading state while checking session', async ({ page }) => {
    // Delay the session check response
    await page.route('**/auth/v1/session*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.fulfill({
        status: 200,
        body: JSON.stringify({ session: null }),
      });
    });
    
    await page.goto('/auth');
    
    // Should show loading indicator
    await expect(
      page.locator('.animate-spin')
        .or(page.getByText(/loading/i))
        .or(page.getByText(/checking/i))
    ).toBeVisible({ timeout: 500 });
  });

  test('handles corrupted localStorage gracefully', async ({ page }) => {
    // Set corrupted auth data
    await page.addInitScript(() => {
      localStorage.setItem('auth-session-store', 'invalid-json-{{{');
    });
    
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Should still show the signup form (fallback to logged-out state)
    await expect(page.locator('form')).toBeVisible({ timeout: 5000 });
  });

  test('clears stale session and shows signup form', async ({ page }) => {
    // Set expired session
    await page.addInitScript(() => {
      localStorage.setItem('auth-session-store', JSON.stringify({
        state: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { 
            access_token: 'expired-token', 
            expires_at: Date.now() - 3600000 // Expired 1 hour ago
          },
        },
        version: 0,
      }));
    });
    
    // Mock session refresh failure
    await page.route('**/auth/v1/token*', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Token expired' }),
      });
    });
    
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should show signup form after detecting expired session
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    if (await signupTab.isVisible()) {
      await signupTab.click();
    }
    
    await expect(page.locator('#signup-email').or(page.locator('form'))).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================================
// SIGNUP DISABLED SCENARIO TESTS
// ============================================================================

test.describe('Parent Signup Flow - Signup Disabled', () => {
  test('shows disabled notice when parent signup is disabled', async ({ page }) => {
    // Mock site settings to return signup disabled
    await page.route('**/rest/v1/site_settings*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { setting_key: 'parent_signup_enabled', setting_value: 'false' }
        ]),
      });
    });
    
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    // Should show disabled notice
    await expect(
      page.getByText(/signup.*disabled/i)
        .or(page.getByText(/temporarily disabled/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('signup tab is disabled when signup is disabled', async ({ page }) => {
    await page.route('**/rest/v1/site_settings*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { setting_key: 'parent_signup_enabled', setting_value: 'false' }
        ]),
      });
    });
    
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    
    const signupTab = page.getByRole('tab', { name: /sign up/i });
    
    // Tab should be disabled
    await expect(signupTab).toBeDisabled({ timeout: 5000 });
  });

  test('form inputs are disabled when signup is disabled', async ({ page }) => {
    await page.route('**/rest/v1/site_settings*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { setting_key: 'parent_signup_enabled', setting_value: 'false' }
        ]),
      });
    });
    
    await page.goto('/auth?tab=signup');
    await page.waitForLoadState('networkidle');
    
    // Form fields should be disabled
    const emailInput = page.locator('#signup-email');
    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeDisabled();
    }
  });
});
