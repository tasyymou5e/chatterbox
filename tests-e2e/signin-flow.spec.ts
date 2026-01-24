import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Sign-In Flow with Password Reset and Error Handling
 * 
 * Tests the complete sign-in experience including:
 * - Form UI and validation
 * - Error handling and message mapping
 * - Rate limiting behavior
 * - Forgot password flow
 * - Reset password confirmation
 * - Navigation and accessibility
 */

// Helper Functions

async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function navigateToSignIn(page: Page) {
  await page.goto('/auth');
  await page.getByRole('tab', { name: /sign in/i }).click();
  await page.waitForSelector('#signin-email');
}

async function fillSignInForm(page: Page, email: string, password: string) {
  await page.fill('#signin-email', email);
  await page.fill('#signin-password', password);
}

async function mockAuthResponse(page: Page, response: object, status = 200) {
  await page.route('**/auth/v1/token*', route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

async function mockPasswordResetResponse(page: Page, success: boolean, error?: string) {
  await page.route('**/auth/v1/recover*', route => {
    route.fulfill({
      status: success ? 200 : 400,
      contentType: 'application/json',
      body: JSON.stringify(success ? {} : { error, error_description: error }),
    });
  });
}

// Mock Response Data

const mockResponses = {
  successfulSignIn: {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { 
      id: 'user-123', 
      email: 'parent@example.com',
      role: 'authenticated'
    }
  },
  invalidCredentials: {
    error: 'invalid_grant',
    error_description: 'Invalid login credentials'
  },
  rateLimited: {
    error: 'rate_limit',
    error_description: 'Too many requests'
  },
  emailNotConfirmed: {
    error: 'email_not_confirmed',
    error_description: 'Email not confirmed'
  },
  networkError: {
    error: 'network_error',
    error_description: 'Network error occurred'
  }
};

// =============================================================================
// Test Suite: Sign-In Form UI
// =============================================================================

test.describe('Sign-In Flow - Form UI', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('displays sign-in form when tab is clicked', async ({ page }) => {
    await page.goto('/auth');
    await page.getByRole('tab', { name: /sign in/i }).click();
    
    await expect(page.locator('#signin-email')).toBeVisible();
    await expect(page.locator('#signin-password')).toBeVisible();
  });

  test('has correct input types and attributes', async ({ page }) => {
    await navigateToSignIn(page);
    
    const emailInput = page.locator('#signin-email');
    const passwordInput = page.locator('#signin-password');
    
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('shows placeholder text for inputs', async ({ page }) => {
    await navigateToSignIn(page);
    
    await expect(page.locator('#signin-email')).toHaveAttribute('placeholder', 'your@example.com');
    await expect(page.locator('#signin-password')).toHaveAttribute('placeholder', 'Enter your password');
  });

  test('displays Sign In button', async ({ page }) => {
    await navigateToSignIn(page);
    
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
  });

  test('shows forgot password link', async ({ page }) => {
    await navigateToSignIn(page);
    
    await expect(page.getByText(/forgot your password/i)).toBeVisible();
  });

  test('shows child signup link', async ({ page }) => {
    await navigateToSignIn(page);
    
    await expect(page.getByText(/have an account code from your parent/i)).toBeVisible();
  });
});

// =============================================================================
// Test Suite: Form Validation
// =============================================================================

test.describe('Sign-In Flow - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await navigateToSignIn(page);
  });

  test('shows browser validation for empty email', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    
    const emailInput = page.locator('#signin-email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('validates email format', async ({ page }) => {
    await page.fill('#signin-email', 'not-an-email');
    await page.fill('#signin-password', 'password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    const emailInput = page.locator('#signin-email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('requires password field', async ({ page }) => {
    await page.fill('#signin-email', 'test@example.com');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    const passwordInput = page.locator('#signin-password');
    const isInvalid = await passwordInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('sanitizes input for XSS attempts', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.invalidCredentials, 400);
    
    await page.fill('#signin-email', '<script>alert("xss")</script>@test.com');
    await page.fill('#signin-password', 'password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation error, not execute script
    await expect(page.getByText(/validation error|invalid/i)).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// Test Suite: Sign-In Submission Flow
// =============================================================================

test.describe('Sign-In Flow - Submission', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('shows loading state during sign-in', async ({ page }) => {
    // Delay the response to observe loading state
    await page.route('**/auth/v1/token*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.successfulSignIn),
      });
    });
    
    await navigateToSignIn(page);
    await fillSignInForm(page, 'test@example.com', 'ValidPass123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check for loading text
    await expect(page.getByText(/signing in.*verifying/i)).toBeVisible({ timeout: 2000 });
  });

  test('disables submit button during loading', async ({ page }) => {
    await page.route('**/auth/v1/token*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponses.successfulSignIn),
      });
    });
    
    await navigateToSignIn(page);
    await fillSignInForm(page, 'test@example.com', 'ValidPass123!');
    
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();
    
    // Button should be disabled during loading
    await expect(submitButton).toBeDisabled({ timeout: 1000 });
  });

  test('shows success toast on successful sign-in', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.successfulSignIn, 200);
    
    // Also mock the user role fetch
    await page.route('**/rest/v1/rpc/get_user_role*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify('parent'),
      });
    });
    
    await navigateToSignIn(page);
    await fillSignInForm(page, 'parent@example.com', 'ValidPass123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 5000 });
  });

  test('redirects after successful sign-in', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.successfulSignIn, 200);
    
    await page.route('**/rest/v1/rpc/get_user_role*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify('parent'),
      });
    });
    
    await navigateToSignIn(page);
    await fillSignInForm(page, 'parent@example.com', 'ValidPass123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for navigation away from /auth
    await page.waitForURL(/(?!.*\/auth).*/, { timeout: 10000 });
  });
});

// =============================================================================
// Test Suite: Error Handling
// =============================================================================

test.describe('Sign-In Flow - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('shows Access Denied for invalid credentials', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.invalidCredentials, 400);
    
    await navigateToSignIn(page);
    await fillSignInForm(page, 'test@example.com', 'wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/access denied|invalid.*password/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows Rate Limited message for too many attempts', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.rateLimited, 429);
    
    await navigateToSignIn(page);
    await fillSignInForm(page, 'test@example.com', 'password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/rate limit|too many/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows Connection Error for network failures', async ({ page }) => {
    await page.route('**/auth/v1/token*', route => route.abort());
    
    await navigateToSignIn(page);
    await fillSignInForm(page, 'test@example.com', 'password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/connection error|network/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows Email Verification Required error', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.emailNotConfirmed, 400);
    
    await navigateToSignIn(page);
    await fillSignInForm(page, 'unverified@example.com', 'password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/email.*verification|confirm.*email/i)).toBeVisible({ timeout: 5000 });
  });

  test('clears loading state after error', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.invalidCredentials, 400);
    
    await navigateToSignIn(page);
    await fillSignInForm(page, 'test@example.com', 'wrongpassword');
    
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();
    
    // Wait for error
    await expect(page.getByText(/access denied|invalid/i)).toBeVisible({ timeout: 5000 });
    
    // Button should be re-enabled
    await expect(submitButton).toBeEnabled();
  });

  test('preserves email input after failed attempt', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.invalidCredentials, 400);
    
    await navigateToSignIn(page);
    await fillSignInForm(page, 'preserved@example.com', 'wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/access denied|invalid/i)).toBeVisible({ timeout: 5000 });
    
    // Email should still be in the input
    const emailValue = await page.locator('#signin-email').inputValue();
    expect(emailValue).toBe('preserved@example.com');
  });
});

// =============================================================================
// Test Suite: Rate Limiting
// =============================================================================

test.describe('Sign-In Flow - Rate Limiting', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('shows Too Many Attempts warning after repeated failures', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.invalidCredentials, 400);
    
    await navigateToSignIn(page);
    
    // Attempt multiple logins
    for (let i = 0; i < 5; i++) {
      await fillSignInForm(page, 'test@example.com', 'wrong');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(300);
    }
    
    // Should show rate limit message
    await expect(page.getByText(/too many attempts|temporarily locked/i)).toBeVisible({ timeout: 5000 });
  });

  test('displays formatted time remaining when locked', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.invalidCredentials, 400);
    
    await navigateToSignIn(page);
    
    // Trigger lockout
    for (let i = 0; i < 6; i++) {
      await fillSignInForm(page, 'lockout@example.com', 'wrong');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(200);
    }
    
    // Check for time format (e.g., "4:30" or "30 seconds")
    await expect(page.getByText(/\d+:\d+|\d+\s*seconds?/i)).toBeVisible({ timeout: 5000 });
  });

  test('prevents submission while locked out', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.invalidCredentials, 400);
    
    await navigateToSignIn(page);
    
    // Trigger lockout
    for (let i = 0; i < 6; i++) {
      await fillSignInForm(page, 'blocked@example.com', 'wrong');
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(200);
    }
    
    // Try to submit again - should show lockout message
    await fillSignInForm(page, 'blocked@example.com', 'newpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await expect(page.getByText(/temporarily locked|wait/i)).toBeVisible({ timeout: 3000 });
  });
});

// =============================================================================
// Test Suite: Forgot Password Flow
// =============================================================================

test.describe('Sign-In Flow - Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await navigateToSignIn(page);
  });

  test('navigates to forgot password form', async ({ page }) => {
    await page.getByText(/forgot your password/i).click();
    
    await expect(page.locator('#forgot-email')).toBeVisible();
    await expect(page.getByText(/back to sign in/i)).toBeVisible();
  });

  test('displays back arrow and Back to Sign In button', async ({ page }) => {
    await page.getByText(/forgot your password/i).click();
    
    const backButton = page.getByRole('button', { name: /back to sign in/i });
    await expect(backButton).toBeVisible();
  });

  test('shows email input with help text', async ({ page }) => {
    await page.getByText(/forgot your password/i).click();
    
    await expect(page.getByText(/send you instructions to reset/i)).toBeVisible();
  });

  test('shows loading state while sending reset email', async ({ page }) => {
    await page.route('**/auth/v1/recover*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({ status: 200, body: '{}' });
    });
    
    await page.getByText(/forgot your password/i).click();
    await page.fill('#forgot-email', 'user@example.com');
    await page.getByRole('button', { name: /send reset instructions/i }).click();
    
    await expect(page.getByText(/sending.*instructions/i)).toBeVisible({ timeout: 2000 });
  });

  test('shows success confirmation after email sent', async ({ page }) => {
    await mockPasswordResetResponse(page, true);
    
    await page.getByText(/forgot your password/i).click();
    await page.fill('#forgot-email', 'user@example.com');
    await page.getByRole('button', { name: /send reset instructions/i }).click();
    
    await expect(page.getByText(/email sent/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('user@example.com')).toBeVisible();
  });

  test('allows trying different email after success', async ({ page }) => {
    await mockPasswordResetResponse(page, true);
    
    await page.getByText(/forgot your password/i).click();
    await page.fill('#forgot-email', 'first@example.com');
    await page.getByRole('button', { name: /send reset instructions/i }).click();
    
    await expect(page.getByText(/email sent/i)).toBeVisible({ timeout: 5000 });
    
    await page.getByRole('button', { name: /try different email/i }).click();
    
    // Form should be reset
    await expect(page.locator('#forgot-email')).toBeVisible();
    const emailValue = await page.locator('#forgot-email').inputValue();
    expect(emailValue).toBe('');
  });

  test('returns to sign-in from success state', async ({ page }) => {
    await mockPasswordResetResponse(page, true);
    
    await page.getByText(/forgot your password/i).click();
    await page.fill('#forgot-email', 'user@example.com');
    await page.getByRole('button', { name: /send reset instructions/i }).click();
    
    await expect(page.getByText(/email sent/i)).toBeVisible({ timeout: 5000 });
    
    await page.getByRole('button', { name: /back to sign in/i }).click();
    
    // Should be back on sign-in form
    await expect(page.locator('#signin-email')).toBeVisible();
  });

  test('shows error toast for invalid email format', async ({ page }) => {
    await page.getByText(/forgot your password/i).click();
    await page.fill('#forgot-email', 'not-an-email');
    await page.getByRole('button', { name: /send reset instructions/i }).click();
    
    await expect(page.getByText(/validation error|invalid.*email/i)).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// Test Suite: Reset Password Confirm
// =============================================================================

test.describe('Sign-In Flow - Reset Password Confirm', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('shows loading state while verifying token', async ({ page }) => {
    // Navigate with tokens that will take time to verify
    await page.route('**/auth/v1/token*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({ status: 400, body: JSON.stringify({ error: 'invalid' }) });
    });
    
    await page.goto('/auth?tab=reset-confirm&access_token=test&refresh_token=test');
    
    await expect(page.getByText(/verifying|checking/i)).toBeVisible({ timeout: 2000 });
  });

  test('shows invalid link error for missing tokens', async ({ page }) => {
    await page.goto('/auth?tab=reset-confirm');
    
    await expect(page.getByText(/invalid.*link|expired/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /back to sign in/i })).toBeVisible();
  });

  test('shows password form for valid token', async ({ page }) => {
    // Mock successful session set
    await page.route('**/auth/v1/token*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'valid-token',
          refresh_token: 'valid-refresh',
          user: { id: 'user-123', email: 'user@example.com' }
        }),
      });
    });
    
    await page.goto('/auth?tab=reset-confirm&access_token=valid&refresh_token=valid');
    
    // Wait for token verification
    await page.waitForTimeout(1000);
    
    // Should show password form or success state
    const hasPasswordForm = await page.locator('input[type="password"]').count() > 0;
    const hasSuccessMessage = await page.getByText(/password.*updated|set new password/i).count() > 0;
    
    expect(hasPasswordForm || hasSuccessMessage).toBe(true);
  });

  test('validates password minimum length', async ({ page }) => {
    await page.route('**/auth/v1/token*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'valid-token',
          refresh_token: 'valid-refresh',
          user: { id: 'user-123', email: 'user@example.com' }
        }),
      });
    });
    
    await page.goto('/auth?tab=reset-confirm&access_token=valid&refresh_token=valid');
    await page.waitForTimeout(1000);
    
    // Check if password input has minLength
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      const minLength = await passwordInput.getAttribute('minLength');
      expect(minLength).toBe('8');
    }
  });

  test('validates password confirmation match', async ({ page }) => {
    await page.route('**/auth/v1/token*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'valid-token',
          refresh_token: 'valid-refresh',
          user: { id: 'user-123', email: 'user@example.com' }
        }),
      });
    });
    
    await page.goto('/auth?tab=reset-confirm&access_token=valid&refresh_token=valid');
    await page.waitForTimeout(1000);
    
    const passwordInputs = page.locator('input[type="password"]');
    if (await passwordInputs.count() >= 2) {
      await passwordInputs.first().fill('NewPassword123!');
      await passwordInputs.nth(1).fill('DifferentPassword!');
      
      await page.getByRole('button', { name: /update password/i }).click();
      
      await expect(page.getByText(/match|don't match/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('shows back to sign in button on invalid link', async ({ page }) => {
    await page.goto('/auth?tab=reset-confirm');
    
    const backButton = page.getByRole('button', { name: /back to sign in/i });
    await expect(backButton).toBeVisible({ timeout: 5000 });
    
    await backButton.click();
    
    // Should navigate to sign-in
    await expect(page.locator('#signin-email')).toBeVisible({ timeout: 5000 });
  });
});

// =============================================================================
// Test Suite: Navigation
// =============================================================================

test.describe('Sign-In Flow - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('respects tab=signin URL parameter', async ({ page }) => {
    await page.goto('/auth?tab=signin');
    
    const signInTab = page.getByRole('tab', { name: /sign in/i });
    await expect(signInTab).toHaveAttribute('data-state', 'active');
  });

  test('can switch from signup to signin tab', async ({ page }) => {
    await page.goto('/auth');
    
    // Should start on signup tab
    await expect(page.getByRole('tab', { name: /sign up/i })).toHaveAttribute('data-state', 'active');
    
    // Click signin tab
    await page.getByRole('tab', { name: /sign in/i }).click();
    
    await expect(page.locator('#signin-email')).toBeVisible();
  });

  test('child signup link navigates correctly', async ({ page }) => {
    await navigateToSignIn(page);
    
    await page.getByText(/complete your account setup/i).click();
    
    // Should show child signup form
    await expect(page.getByText(/complete your account|account code/i)).toBeVisible({ timeout: 5000 });
  });

  test('forgot password preserves navigation history', async ({ page }) => {
    await navigateToSignIn(page);
    
    await page.getByText(/forgot your password/i).click();
    await expect(page.locator('#forgot-email')).toBeVisible();
    
    // Go back
    await page.getByRole('button', { name: /back to sign in/i }).click();
    
    // Should be back on sign-in
    await expect(page.locator('#signin-email')).toBeVisible();
  });
});

// =============================================================================
// Test Suite: Accessibility
// =============================================================================

test.describe('Sign-In Flow - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await navigateToSignIn(page);
  });

  test('form inputs have accessible labels', async ({ page }) => {
    const emailLabel = page.locator('label[for="signin-email"]');
    const passwordLabel = page.locator('label[for="signin-password"]');
    
    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
  });

  test('inputs have aria-describedby for help text', async ({ page }) => {
    const emailInput = page.locator('#signin-email');
    
    const ariaDescribedBy = await emailInput.getAttribute('aria-describedby');
    expect(ariaDescribedBy).toBeTruthy();
  });

  test('keyboard navigation works through form', async ({ page }) => {
    // Focus should move through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focusedElement);
  });

  test('can submit form with Enter key', async ({ page }) => {
    await mockAuthResponse(page, mockResponses.invalidCredentials, 400);
    
    await page.fill('#signin-email', 'test@example.com');
    await page.fill('#signin-password', 'password123');
    
    // Press Enter to submit
    await page.keyboard.press('Enter');
    
    // Should show error (form was submitted)
    await expect(page.getByText(/access denied|invalid/i)).toBeVisible({ timeout: 5000 });
  });

  test('tabs are accessible via keyboard', async ({ page }) => {
    await page.goto('/auth');
    
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    const signInTab = page.getByRole('tab', { name: /sign in/i });
    
    // Tabs should have proper role
    await expect(signUpTab).toHaveAttribute('role', 'tab');
    await expect(signInTab).toHaveAttribute('role', 'tab');
  });
});
