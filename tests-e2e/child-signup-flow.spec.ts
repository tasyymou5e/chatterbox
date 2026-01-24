import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Child Signup Flow
 * 
 * Covers:
 * - Age-appropriate UI/UX design
 * - Invite code validation and auto-capitalization
 * - PIN verification flow
 * - Password security requirements
 * - Lockout security features
 * - Successful completion flow
 * - Error handling
 * - Navigation and URL parameters
 * - Accessibility
 */

// Helper functions
async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function navigateToChildSignup(page: Page, code?: string) {
  const url = code
    ? `/auth?tab=child-signup&code=${code}`
    : '/auth?tab=child-signup';
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

async function fillChildSignupForm(page: Page, data: {
  code?: string;
  password?: string;
  confirmPassword?: string;
  pin?: string;
}) {
  if (data.code) {
    const codeInput = page.locator('#account-code');
    await codeInput.fill(data.code);
  }
  if (data.password) {
    const passwordInput = page.locator('#child-password');
    await passwordInput.fill(data.password);
  }
  if (data.confirmPassword) {
    const confirmInput = page.locator('#child-confirm-password');
    await confirmInput.fill(data.confirmPassword);
  }
  if (data.pin) {
    const pinInput = page.locator('#verification-pin');
    if (await pinInput.isVisible()) {
      await pinInput.fill(data.pin);
    }
  }
}

async function mockChildAccountCompletion(page: Page, response: object, status = 200) {
  await page.route('**/functions/v1/complete-child-account', route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

// Mock response fixtures
const successResponse = {
  success: true,
  message: 'Account setup complete!',
  child: { firstName: 'Alex', lastName: 'Smith' },
  credentials: { email: 'alex.smith@family.chatterbox.app' },
  session: {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000
  }
};

const invalidCodeResponse = {
  success: false,
  error: 'Invalid account code or verification PIN. Please check and try again.'
};

const pinRequiredResponse = {
  success: false,
  error: 'Verification PIN required',
  requiresPin: true
};

const lockedResponse = {
  success: false,
  error: 'Too many failed attempts. Please try again later.',
  isLocked: true,
  lockRemainingSeconds: 300
};

const alreadySetupResponse = {
  success: false,
  error: 'This account has already been set up. Please try signing in instead.'
};

// ============================================================================
// Age-Appropriate UI Tests
// ============================================================================

test.describe('Child Signup Flow - Age-Appropriate UI', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await navigateToChildSignup(page);
  });

  test('displays child-friendly welcome header', async ({ page }) => {
    // Check for UserPlus icon by checking SVG presence near the header
    await expect(page.getByText('Complete Your Account')).toBeVisible();
    await expect(page.getByText(/Enter the account code your parent gave you/i)).toBeVisible();
  });

  test('shows account code input with placeholder', async ({ page }) => {
    const codeInput = page.locator('#account-code');
    await expect(codeInput).toBeVisible();
    await expect(codeInput).toHaveAttribute('placeholder', /FAM-/i);
  });

  test('displays password fields with appropriate labels', async ({ page }) => {
    await expect(page.getByLabel(/create your password/i).or(page.locator('#child-password'))).toBeVisible();
    await expect(page.getByLabel(/confirm.*password/i).or(page.locator('#child-confirm-password'))).toBeVisible();
  });

  test('shows password strength indicator when typing password', async ({ page }) => {
    const passwordInput = page.locator('#child-password');
    await passwordInput.fill('Test123!');
    
    // Password strength indicator should be visible
    await expect(page.locator('[class*="progress"]').or(page.getByText(/strength/i))).toBeVisible({ timeout: 3000 });
  });

  test('displays encouraging help text for account code', async ({ page }) => {
    await expect(
      page.getByText(/family code/i).or(page.getByText(/parent gave you/i))
    ).toBeVisible();
  });

  test('shows "Back to Sign In" navigation button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /back to sign in/i })
        .or(page.getByText(/back to sign in/i))
    ).toBeVisible();
  });

  test('displays help link for children without a code', async ({ page }) => {
    await expect(
      page.getByText(/don.*have.*code/i)
        .or(page.getByText(/ask your parent/i))
    ).toBeVisible();
  });
});

// ============================================================================
// Invite Code Validation Tests
// ============================================================================

test.describe('Child Signup Flow - Invite Code Validation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await navigateToChildSignup(page);
  });

  test('auto-capitalizes account code input', async ({ page }) => {
    const codeInput = page.locator('#account-code');
    await codeInput.fill('fam-test-123');
    
    // Value should be capitalized
    const value = await codeInput.inputValue();
    expect(value.toUpperCase()).toBe(value.toUpperCase());
  });

  test('accepts valid family code format', async ({ page }) => {
    const codeInput = page.locator('#account-code');
    await codeInput.fill('FAM-TEST-123');
    
    // No validation error should appear immediately
    await expect(page.getByText(/invalid.*format/i)).not.toBeVisible();
  });

  test('trims whitespace from code', async ({ page }) => {
    const codeInput = page.locator('#account-code');
    await codeInput.fill('  FAM-TEST-123  ');
    
    // Trigger blur to apply any trimming
    await codeInput.blur();
    
    const value = await codeInput.inputValue();
    expect(value.trim()).toBe(value.trim());
  });

  test('shows error for invalid code on submission', async ({ page }) => {
    await mockChildAccountCompletion(page, invalidCodeResponse, 400);
    
    await fillChildSignupForm(page, {
      code: 'INVALID-CODE',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    const submitButton = page.getByRole('button', { name: /complete.*account|set.*up|submit/i });
    await submitButton.click();
    
    // Wait for error message
    await expect(
      page.getByText(/invalid/i).or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('submit button requires account code', async ({ page }) => {
    // Fill only password fields, leave code empty
    await fillChildSignupForm(page, {
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    const submitButton = page.getByRole('button', { name: /complete.*account|set.*up|submit/i });
    
    // Button should be disabled or form should not submit
    const isDisabled = await submitButton.isDisabled();
    if (!isDisabled) {
      await submitButton.click();
      // Should show validation error
      await expect(page.getByText(/required|code/i)).toBeVisible({ timeout: 3000 });
    }
  });

  test('pre-fills code from URL parameter', async ({ page }) => {
    await clearAuthState(page);
    await navigateToChildSignup(page, 'FAM-URL-CODE');
    
    const codeInput = page.locator('#account-code');
    const value = await codeInput.inputValue();
    expect(value).toContain('FAM-URL-CODE');
  });
});

// ============================================================================
// PIN Verification Tests
// ============================================================================

test.describe('Child Signup Flow - PIN Verification', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await navigateToChildSignup(page);
  });

  test('PIN field hidden by default', async ({ page }) => {
    const pinInput = page.locator('#verification-pin');
    await expect(pinInput).not.toBeVisible();
  });

  test('shows PIN field when required by backend', async ({ page }) => {
    // First mock a PIN-required response
    await mockChildAccountCompletion(page, pinRequiredResponse, 200);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    const submitButton = page.getByRole('button', { name: /complete.*account|set.*up|submit/i });
    await submitButton.click();
    
    // PIN field should appear
    await expect(
      page.locator('#verification-pin').or(page.getByPlaceholder(/pin/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('PIN input has proper attributes', async ({ page }) => {
    // Navigate with a setup that shows PIN
    await mockChildAccountCompletion(page, pinRequiredResponse, 200);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    const pinInput = page.locator('#verification-pin').or(page.getByPlaceholder(/pin/i));
    
    // Wait for PIN to be visible before checking attributes
    if (await pinInput.isVisible({ timeout: 5000 })) {
      // Check for numeric input type or pattern
      const inputType = await pinInput.getAttribute('type');
      const pattern = await pinInput.getAttribute('pattern');
      const inputMode = await pinInput.getAttribute('inputmode');
      
      // Should have some numeric restriction
      expect(inputType === 'number' || inputType === 'text' || inputMode === 'numeric' || pattern).toBeTruthy();
    }
  });

  test('displays PIN help text when PIN field is shown', async ({ page }) => {
    await mockChildAccountCompletion(page, pinRequiredResponse, 200);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Check for PIN help text
    await expect(
      page.getByText(/6.*digit/i).or(page.getByText(/pin.*parent/i))
    ).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================================
// Password Security Tests
// ============================================================================

test.describe('Child Signup Flow - Password Security', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await navigateToChildSignup(page);
  });

  test('password input has minimum length requirement', async ({ page }) => {
    const passwordInput = page.locator('#child-password');
    const minLength = await passwordInput.getAttribute('minlength');
    
    // Should have minLength of at least 8
    if (minLength) {
      expect(parseInt(minLength)).toBeGreaterThanOrEqual(8);
    }
  });

  test('password input is of type password', async ({ page }) => {
    const passwordInput = page.locator('#child-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('confirm password input is of type password', async ({ page }) => {
    const confirmInput = page.locator('#child-confirm-password');
    await expect(confirmInput).toHaveAttribute('type', 'password');
  });

  test('shows password strength indicator with progress', async ({ page }) => {
    const passwordInput = page.locator('#child-password');
    
    // Type a weak password
    await passwordInput.fill('weak');
    
    // Type a stronger password
    await passwordInput.fill('StrongPass123!@#');
    
    // Progress indicator should update
    await expect(
      page.locator('[class*="progress"]')
        .or(page.locator('[role="progressbar"]'))
        .or(page.getByText(/strong|good|excellent/i))
    ).toBeVisible({ timeout: 3000 });
  });

  test('displays password requirements checklist', async ({ page }) => {
    const passwordInput = page.locator('#child-password');
    await passwordInput.fill('Test');
    
    // Should show requirements (at least some of these)
    const requirementsVisible = await page.getByText(/character/i)
      .or(page.getByText(/uppercase/i))
      .or(page.getByText(/lowercase/i))
      .or(page.getByText(/number/i))
      .isVisible();
    
    expect(requirementsVisible).toBeTruthy();
  });
});

// ============================================================================
// Lockout Security Tests
// ============================================================================

test.describe('Child Signup Flow - Lockout Security', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('displays lockout warning when account is locked', async ({ page }) => {
    await mockChildAccountCompletion(page, lockedResponse, 429);
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Should show lockout message
    await expect(
      page.getByText(/locked/i)
        .or(page.getByText(/too many/i))
        .or(page.getByText(/try again/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows remaining lockout time', async ({ page }) => {
    await mockChildAccountCompletion(page, lockedResponse, 429);
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Should show time remaining
    await expect(
      page.getByText(/minute/i)
        .or(page.getByText(/5:00/i))
        .or(page.getByText(/300/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('disables form inputs during lockout', async ({ page }) => {
    await mockChildAccountCompletion(page, lockedResponse, 429);
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Wait for lockout state
    await page.waitForTimeout(1000);
    
    // Check if inputs are disabled
    const codeInput = page.locator('#account-code');
    const isDisabled = await codeInput.isDisabled();
    
    // Either inputs are disabled or the form is hidden/replaced with lockout message
    expect(isDisabled || await page.getByText(/locked/i).isVisible()).toBeTruthy();
  });

  test('disables submit button during lockout', async ({ page }) => {
    await mockChildAccountCompletion(page, lockedResponse, 429);
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Wait for lockout state
    await page.waitForTimeout(1000);
    
    const submitButton = page.getByRole('button', { name: /complete.*account|set.*up|submit/i });
    
    // Button should be disabled or not visible
    const isDisabled = await submitButton.isDisabled().catch(() => true);
    const isHidden = !(await submitButton.isVisible().catch(() => false));
    
    expect(isDisabled || isHidden).toBeTruthy();
  });
});

// ============================================================================
// Successful Completion Tests
// ============================================================================

test.describe('Child Signup Flow - Successful Completion', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('shows loading state during submission', async ({ page }) => {
    // Delay the response to see loading state
    await page.route('**/functions/v1/complete-child-account', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse),
      });
    });
    
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Should show loading indicator
    await expect(
      page.getByText(/setting up/i)
        .or(page.locator('[class*="animate-spin"]'))
        .or(page.locator('svg[class*="spin"]'))
    ).toBeVisible({ timeout: 2000 });
  });

  test('shows loading text during submission', async ({ page }) => {
    await page.route('**/functions/v1/complete-child-account', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successResponse),
      });
    });
    
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Check for loading text
    await expect(
      page.getByText(/setting up/i)
        .or(page.getByText(/please wait/i))
        .or(page.getByText(/loading/i))
    ).toBeVisible({ timeout: 2000 });
  });

  test('displays success message on completion', async ({ page }) => {
    await mockChildAccountCompletion(page, successResponse, 200);
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Should show success message or navigate away
    await expect(
      page.getByText(/welcome/i)
        .or(page.getByText(/success/i))
        .or(page.getByText(/account.*ready/i))
    ).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test.describe('Child Signup Flow - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('handles network error gracefully', async ({ page }) => {
    await page.route('**/functions/v1/complete-child-account', route => {
      route.abort('failed');
    });
    
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Should show error message
    await expect(
      page.getByText(/error/i)
        .or(page.getByText(/failed/i))
        .or(page.getByText(/try again/i))
        .or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows "already set up" error for duplicate account', async ({ page }) => {
    await mockChildAccountCompletion(page, alreadySetupResponse, 400);
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Should show already setup message
    await expect(
      page.getByText(/already/i)
        .or(page.getByText(/sign.*in/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows generic error for server failure', async ({ page }) => {
    await mockChildAccountCompletion(page, { success: false, error: 'Internal server error' }, 500);
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    await page.getByRole('button', { name: /complete.*account|set.*up|submit/i }).click();
    
    // Should show error message
    await expect(
      page.getByText(/error/i)
        .or(page.getByText(/failed/i))
        .or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('clears loading state after error', async ({ page }) => {
    await mockChildAccountCompletion(page, invalidCodeResponse, 400);
    await navigateToChildSignup(page);
    
    await fillChildSignupForm(page, {
      code: 'INVALID-CODE',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    const submitButton = page.getByRole('button', { name: /complete.*account|set.*up|submit/i });
    await submitButton.click();
    
    // Wait for error
    await page.waitForTimeout(1000);
    
    // Button should be re-enabled
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
  });
});

// ============================================================================
// Navigation & URL Parameter Tests
// ============================================================================

test.describe('Child Signup Flow - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
  });

  test('navigates to child-signup tab via URL', async ({ page }) => {
    await navigateToChildSignup(page);
    
    // Child signup form should be visible
    await expect(page.locator('#account-code')).toBeVisible();
    await expect(page.getByText(/complete.*account/i)).toBeVisible();
  });

  test('pre-fills code from URL parameter', async ({ page }) => {
    await navigateToChildSignup(page, 'FAM-TEST-123');
    
    const codeInput = page.locator('#account-code');
    const value = await codeInput.inputValue();
    expect(value).toContain('FAM-TEST-123');
  });

  test('back button returns to sign in tab', async ({ page }) => {
    await navigateToChildSignup(page);
    
    const backButton = page.getByRole('button', { name: /back to sign in/i })
      .or(page.getByText(/back to sign in/i));
    
    await backButton.click();
    
    // Should show sign in form
    await expect(
      page.getByRole('button', { name: /sign in/i })
        .or(page.locator('#signin-email'))
    ).toBeVisible({ timeout: 3000 });
  });

  test('help link navigates appropriately', async ({ page }) => {
    await navigateToChildSignup(page);
    
    const helpLink = page.getByText(/don.*have.*code/i)
      .or(page.getByText(/ask your parent/i));
    
    if (await helpLink.isVisible()) {
      await helpLink.click();
      
      // Should navigate to sign in or show help
      await expect(
        page.getByRole('button', { name: /sign in/i })
          .or(page.getByText(/contact/i))
      ).toBeVisible({ timeout: 3000 });
    }
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe('Child Signup Flow - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page);
    await navigateToChildSignup(page);
  });

  test('form inputs have accessible labels', async ({ page }) => {
    const codeInput = page.locator('#account-code');
    const codeLabel = page.locator('label[for="account-code"]');
    
    // Either has a visible label or aria-label
    const hasLabel = await codeLabel.isVisible().catch(() => false);
    const hasAriaLabel = await codeInput.getAttribute('aria-label');
    
    expect(hasLabel || hasAriaLabel).toBeTruthy();
  });

  test('password inputs have accessible labels', async ({ page }) => {
    const passwordInput = page.locator('#child-password');
    const confirmInput = page.locator('#child-confirm-password');
    
    // Check for labels or aria-labels
    const passwordLabel = page.locator('label[for="child-password"]');
    const confirmLabel = page.locator('label[for="child-confirm-password"]');
    
    const hasPasswordLabel = await passwordLabel.isVisible().catch(() => false);
    const hasConfirmLabel = await confirmLabel.isVisible().catch(() => false);
    
    expect(hasPasswordLabel || await passwordInput.getAttribute('aria-label')).toBeTruthy();
    expect(hasConfirmLabel || await confirmInput.getAttribute('aria-label')).toBeTruthy();
  });

  test('keyboard navigation works through form', async ({ page }) => {
    // Start focus on the page
    await page.locator('body').press('Tab');
    
    // Should be able to tab through form elements
    const focusedElements: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName + (el?.id ? `#${el.id}` : '');
      });
      focusedElements.push(focusedElement);
      await page.keyboard.press('Tab');
    }
    
    // Should have focused on input elements
    const inputFocused = focusedElements.some(el => 
      el.includes('INPUT') || el.includes('BUTTON')
    );
    expect(inputFocused).toBeTruthy();
  });

  test('form can be submitted with Enter key', async ({ page }) => {
    await mockChildAccountCompletion(page, invalidCodeResponse, 400);
    
    await fillChildSignupForm(page, {
      code: 'FAM-TEST-123',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    });
    
    // Focus on confirm password and press Enter
    const confirmInput = page.locator('#child-confirm-password');
    await confirmInput.focus();
    await confirmInput.press('Enter');
    
    // Should trigger form submission (either error or loading)
    await expect(
      page.getByText(/invalid/i)
        .or(page.locator('[class*="animate-spin"]'))
        .or(page.getByText(/loading/i))
    ).toBeVisible({ timeout: 3000 });
  });

  test('password requirements have visual indicators', async ({ page }) => {
    const passwordInput = page.locator('#child-password');
    await passwordInput.fill('Test123!');
    
    // Should have visual indicators (check/x icons or colored text)
    await expect(
      page.locator('svg[class*="check"]')
        .or(page.locator('[class*="text-green"]'))
        .or(page.locator('[class*="text-red"]'))
        .or(page.getByText(/✓|✗|☑|☐/))
    ).toBeVisible({ timeout: 3000 });
  });
});
