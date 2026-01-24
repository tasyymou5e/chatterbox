import { Page, expect } from '@playwright/test';

/**
 * Visual regression test utilities for consistent screenshot capture
 * across authentication components.
 */

/**
 * Wait for the UI to stabilize before taking screenshots.
 * Ensures fonts are loaded, network is idle, and CSS transitions complete.
 */
export async function waitForStableUI(page: Page, timeout = 200): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(timeout); // Allow CSS transitions to settle
}

/**
 * Hide toast notifications that might interfere with screenshots.
 * Useful when you want to capture the form state without transient messages.
 */
export async function hideToasts(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('[data-sonner-toast], [role="status"]').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
  });
}

/**
 * Mask dynamic content like timestamps and countdowns.
 * These elements change between test runs and would cause false positives.
 */
export async function maskDynamicContent(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Mask countdown timers
    document.querySelectorAll('[data-testid="lockout-timer"], [data-testid="lock-timer"]').forEach(el => {
      (el as HTMLElement).textContent = '00:00';
    });
    
    // Mask any timestamp elements
    document.querySelectorAll('[data-testid*="timestamp"]').forEach(el => {
      (el as HTMLElement).textContent = '00:00:00';
    });
  });
}

/**
 * Capture a full-form screenshot with optional masking and configuration.
 */
export async function captureFormScreenshot(
  page: Page,
  name: string,
  options?: {
    fullPage?: boolean;
    mask?: string[];
    maxDiffPixels?: number;
    threshold?: number;
  }
): Promise<void> {
  await waitForStableUI(page);
  await maskDynamicContent(page);

  // Build mask locators from selectors
  const maskLocators = options?.mask?.map(sel => page.locator(sel)) ?? [];

  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: options?.fullPage ?? false,
    mask: maskLocators,
    animations: 'disabled',
    maxDiffPixels: options?.maxDiffPixels ?? 100,
    threshold: options?.threshold ?? 0.2,
  });
}

/**
 * Capture a screenshot of a specific element.
 * Useful for testing component states like password strength indicators.
 */
export async function captureElementScreenshot(
  page: Page,
  selector: string,
  name: string,
  options?: {
    maxDiffPixels?: number;
    threshold?: number;
  }
): Promise<void> {
  await waitForStableUI(page);

  const element = page.locator(selector);
  await expect(element).toBeVisible();

  await expect(element).toHaveScreenshot(`${name}.png`, {
    animations: 'disabled',
    maxDiffPixels: options?.maxDiffPixels ?? 50,
    threshold: options?.threshold ?? 0.2,
  });
}

/**
 * Mock an authentication error response for testing error states.
 */
export async function mockAuthError(
  page: Page,
  errorMessage = 'Invalid login credentials'
): Promise<void> {
  await page.route('**/auth/v1/token*', async route => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: errorMessage,
      }),
    });
  });
}

/**
 * Mock a slow authentication response to capture loading states.
 */
export async function mockSlowAuthResponse(page: Page, delayMs = 5000): Promise<void> {
  await page.route('**/auth/v1/token*', async route => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    await route.abort();
  });
}

/**
 * Mock a rate limit / lockout response.
 */
export async function mockRateLimitResponse(page: Page): Promise<void> {
  await page.route('**/auth/v1/token*', async route => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'rate_limit',
        error_description: 'Too many requests. Please wait before trying again.',
      }),
    });
  });
}

/**
 * Mock the child signup edge function to require PIN verification.
 */
export async function mockPinRequiredResponse(page: Page): Promise<void> {
  await page.route('**/functions/v1/complete-child-account', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'PIN_REQUIRED',
        message: 'Please enter the verification PIN sent to your parent.',
        requiresPin: true,
      }),
    });
  });
}

/**
 * Mock the child signup edge function to return a locked account state.
 */
export async function mockLockedAccountResponse(page: Page): Promise<void> {
  await page.route('**/functions/v1/complete-child-account', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: 'This account code has been locked due to too many failed attempts.',
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }),
    });
  });
}

/**
 * Fill the sign-in form with provided credentials.
 */
export async function fillSignInForm(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.fill('#signin-email', email);
  await page.fill('#signin-password', password);
}

/**
 * Fill the sign-up form with provided details.
 */
export async function fillSignUpForm(
  page: Page,
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<void> {
  await page.fill('#first-name', firstName);
  await page.fill('#last-name', lastName);
  await page.fill('#signup-email', email);
  await page.fill('#signup-password', password);
}

/**
 * Submit a failed login multiple times to trigger rate limiting.
 */
export async function triggerRateLimitLockout(
  page: Page,
  attempts = 5
): Promise<void> {
  await mockAuthError(page);

  for (let i = 0; i < attempts; i++) {
    await fillSignInForm(page, 'test@example.com', 'wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(500);
  }
}
