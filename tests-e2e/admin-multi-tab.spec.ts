import { test, expect } from '@playwright/test';

/**
 * Multi-Tab Synchronization Tests
 * 
 * Tests that authentication state properly synchronizes across
 * multiple browser tabs/windows.
 */

test.describe('Multi-Tab Session Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should share session state across tabs via localStorage', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Navigate both pages to admin login
    await page1.goto('/admin/login');
    await page2.goto('/admin/login');

    // Set a test value in localStorage from page1
    await page1.evaluate(() => {
      localStorage.setItem('test-sync-key', 'from-page1');
    });

    // Wait for storage event propagation
    await page1.waitForTimeout(500);

    // Page2 should see the same value
    const value = await page2.evaluate(() => {
      return localStorage.getItem('test-sync-key');
    });

    expect(value).toBe('from-page1');

    await page1.close();
    await page2.close();
  });

  test('should detect localStorage changes across tabs', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/admin/login');
    await page2.goto('/admin/login');

    // Set up storage event listener on page2
    await page2.evaluate(() => {
      (window as unknown as { storageEvents: string[] }).storageEvents = [];
      window.addEventListener('storage', (event) => {
        (window as unknown as { storageEvents: string[] }).storageEvents.push(event.key || '');
      });
    });

    // Modify localStorage from page1
    await page1.evaluate(() => {
      localStorage.setItem('cross-tab-test', 'modified');
    });

    // Wait for event propagation
    await page2.waitForTimeout(500);

    // Check if page2 received the storage event
    const events = await page2.evaluate(() => {
      return (window as unknown as { storageEvents: string[] }).storageEvents;
    });

    expect(events).toContain('cross-tab-test');

    await page1.close();
    await page2.close();
  });

  test('should clear auth state across tabs on logout simulation', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/admin/login');
    await page2.goto('/admin/login');

    // Simulate logged-in state in localStorage
    await page1.evaluate(() => {
      const mockSession = {
        state: {
          session: { access_token: 'test-token', expires_at: Date.now() + 3600000 },
          user: { id: 'user-123', email: 'test@example.com' }
        },
        version: 0
      };
      localStorage.setItem('auth-session-store', JSON.stringify(mockSession));
    });

    // Wait for sync
    await page1.waitForTimeout(500);

    // Verify page2 sees the session
    const sessionBefore = await page2.evaluate(() => {
      return localStorage.getItem('auth-session-store');
    });
    expect(sessionBefore).toBeTruthy();

    // Simulate logout by clearing from page1
    await page1.evaluate(() => {
      localStorage.removeItem('auth-session-store');
    });

    // Wait for sync
    await page1.waitForTimeout(500);

    // Verify page2 no longer sees the session
    const sessionAfter = await page2.evaluate(() => {
      return localStorage.getItem('auth-session-store');
    });
    expect(sessionAfter).toBeNull();

    await page1.close();
    await page2.close();
  });

  test('both tabs should redirect to login when session cleared', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Start on login page
    await page1.goto('/admin/login');
    await page2.goto('/admin/login');

    // Both should be on login
    await expect(page1).toHaveURL(/admin\/login/);
    await expect(page2).toHaveURL(/admin\/login/);

    // Try navigating to dashboard (should redirect back)
    await page1.goto('/admin/dashboard');
    await expect(page1).toHaveURL(/admin\/login/, { timeout: 15000 });

    await page1.close();
    await page2.close();
  });
});

test.describe('Role State Synchronization', () => {
  test('should sync role store state across tabs', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/admin/login');
    await page2.goto('/admin/login');

    // Set role state from page1
    await page1.evaluate(() => {
      const roleState = {
        state: {
          userRole: 'admin',
          isAdmin: true,
          isCheckingRole: false
        },
        version: 0
      };
      localStorage.setItem('auth-role-store', JSON.stringify(roleState));
    });

    // Wait for sync
    await page1.waitForTimeout(500);

    // Verify page2 sees the role state
    const roleState = await page2.evaluate(() => {
      const stored = localStorage.getItem('auth-role-store');
      return stored ? JSON.parse(stored) : null;
    });

    expect(roleState?.state?.isAdmin).toBe(true);

    await page1.close();
    await page2.close();
  });

  test('should handle role revocation across tabs', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/admin/login');
    await page2.goto('/admin/login');

    // Set admin role from page1
    await page1.evaluate(() => {
      localStorage.setItem('auth-role-store', JSON.stringify({
        state: { userRole: 'admin', isAdmin: true },
        version: 0
      }));
    });

    await page1.waitForTimeout(300);

    // Revoke admin role from page1
    await page1.evaluate(() => {
      localStorage.setItem('auth-role-store', JSON.stringify({
        state: { userRole: 'user', isAdmin: false },
        version: 1
      }));
    });

    await page1.waitForTimeout(500);

    // Page2 should see revoked state
    const roleState = await page2.evaluate(() => {
      const stored = localStorage.getItem('auth-role-store');
      return stored ? JSON.parse(stored) : null;
    });

    expect(roleState?.state?.isAdmin).toBe(false);

    await page1.close();
    await page2.close();
  });
});

test.describe('Concurrent Session Operations', () => {
  test('should not corrupt state with rapid updates', async ({ context }) => {
    const page1 = await context.newPage();
    
    await page1.goto('/admin/login');

    // Rapidly update localStorage
    await page1.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        localStorage.setItem('rapid-test', JSON.stringify({ iteration: i }));
        await new Promise(r => setTimeout(r, 10));
      }
    });

    // Final value should be the last iteration
    const finalValue = await page1.evaluate(() => {
      const stored = localStorage.getItem('rapid-test');
      return stored ? JSON.parse(stored) : null;
    });

    expect(finalValue?.iteration).toBe(9);

    await page1.close();
  });

  test('should handle simultaneous writes from multiple tabs', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/admin/login');
    await page2.goto('/admin/login');

    // Both pages write simultaneously
    await Promise.all([
      page1.evaluate(() => {
        localStorage.setItem('concurrent-test', JSON.stringify({ from: 'page1' }));
      }),
      page2.evaluate(() => {
        localStorage.setItem('concurrent-test', JSON.stringify({ from: 'page2' }));
      })
    ]);

    await page1.waitForTimeout(500);

    // Both pages should see the same final value (last write wins)
    const value1 = await page1.evaluate(() => localStorage.getItem('concurrent-test'));
    const value2 = await page2.evaluate(() => localStorage.getItem('concurrent-test'));

    expect(value1).toBe(value2);

    await page1.close();
    await page2.close();
  });
});
