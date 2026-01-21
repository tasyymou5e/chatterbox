# Testing Documentation

> **Last Updated:** 2026-01-21  
> **Test Framework:** Vitest (unit/component), Playwright (E2E)  
> **Coverage Target:** 80%+

## Overview

This document provides comprehensive guidance for testing the Chatterbox platform, including unit tests, component tests, integration tests, E2E tests, and RLS policy tests.

---

## Table of Contents

1. [Test Architecture](#test-architecture)
2. [Running Tests](#running-tests)
3. [Component Tests](#component-tests)
4. [Hook Tests](#hook-tests)
5. [Store Tests](#store-tests)
6. [RLS Policy Tests](#rls-policy-tests)
7. [E2E Tests](#e2e-tests)
8. [Test Utilities](#test-utilities)
9. [Best Practices](#best-practices)

---

## Test Architecture

### Directory Structure

```
tests/
├── component/                    # Vitest component tests
│   ├── games/                    # Game component tests
│   │   └── MemoryMatchGame.test.tsx
│   ├── hooks/                    # Hook tests
│   │   ├── useAuth.test.tsx
│   │   ├── useChoreManagement.test.ts
│   │   └── useLoginRateLimiter.test.tsx
│   ├── pages/                    # Page component tests
│   │   ├── Auth.test.tsx
│   │   ├── GamesCatalog.test.tsx
│   │   ├── Index.test.tsx
│   │   ├── KidsPortal.test.tsx
│   │   └── ParentDashboard.test.tsx
│   ├── stores/                   # Zustand store tests
│   │   ├── authStore.test.ts
│   │   ├── choreStore.test.ts
│   │   └── gamificationStore.test.ts
│   ├── ui/                       # UI component tests
│   │   ├── Button.test.tsx
│   │   └── Card.test.tsx
│   ├── setup.ts                  # Test setup
│   └── test-utils.tsx            # Test utilities
│
├── rls/                          # RLS policy tests
│   ├── child/
│   │   └── child-accounts.test.ts
│   ├── cross-cutting/
│   │   └── family-isolation.test.ts
│   ├── family/
│   │   └── families.test.ts
│   └── user/
│       └── profiles.test.ts
│
├── utils/                        # Test utilities
│   ├── assertions.ts             # Custom assertions
│   ├── cleanup.ts                # Test cleanup helpers
│   ├── testClient.ts             # Test Supabase client
│   ├── testFamilies.ts           # Test family factories
│   └── testUsers.ts              # Test user factories
│
├── workflows/                    # Integration workflow tests
│   └── parent-child-account-creation.test.ts
│
└── setup.ts                      # Global test setup

tests-e2e/                        # Playwright E2E tests
├── fixtures/
│   └── auth.fixture.ts           # Auth fixtures
├── admin-workflows.spec.ts       # Admin workflow tests
├── auth.spec.ts                  # Authentication tests
├── games-catalog.spec.ts         # Games catalog tests
├── homepage.spec.ts              # Homepage tests
├── navigation.spec.ts            # Navigation tests
└── parent-dashboard.spec.ts      # Parent dashboard tests
```

### Configuration Files

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `tests/setup.ts` - Global test setup
- `tests/component/setup.ts` - Component test setup

---

## Running Tests

### NPM Scripts

```bash
# Run all Vitest tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run linting
npm run lint

# Run TypeScript checks
npm run typecheck
```

### Filtering Tests

```bash
# Run specific test file
npm run test -- tests/component/hooks/useAuth.test.tsx

# Run tests matching pattern
npm run test -- --grep "authentication"

# Run RLS tests only
npm run test -- tests/rls/
```

---

## Component Tests

### Setup

```typescript
// tests/component/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### Test Utilities

```typescript
// tests/component/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
```

### Example Component Test

```typescript
// tests/component/ui/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with default variant', () => {
    renderWithProviders(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    renderWithProviders(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    renderWithProviders(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders different variants', () => {
    const { rerender } = renderWithProviders(
      <Button variant="destructive">Delete</Button>
    );
    
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
    
    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });
});
```

---

## Hook Tests

### Testing Custom Hooks

```typescript
// tests/component/hooks/useAuth.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with no user', async () => {
    const { result } = renderHook(() => useAuth());
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles sign in', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { user: mockUser, access_token: 'token' };
    
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });
    
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });
});
```

### Testing Rate Limiter Hook

```typescript
// tests/component/hooks/useLoginRateLimiter.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoginRateLimiter } from '@/hooks/useLoginRateLimiter';

describe('useLoginRateLimiter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allows attempts initially', () => {
    const { result } = renderHook(() => useLoginRateLimiter());
    
    expect(result.current.canAttempt).toBe(true);
    expect(result.current.remainingAttempts).toBe(5);
  });

  it('decrements attempts on failure', () => {
    const { result } = renderHook(() => useLoginRateLimiter());
    
    act(() => {
      result.current.recordAttempt(false);
    });
    
    expect(result.current.remainingAttempts).toBe(4);
  });

  it('blocks after max failures', () => {
    const { result } = renderHook(() => useLoginRateLimiter());
    
    // Exhaust all attempts
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.recordAttempt(false);
      });
    }
    
    expect(result.current.canAttempt).toBe(false);
    expect(result.current.lockoutTime).toBeGreaterThan(0);
  });

  it('resets on successful login', () => {
    const { result } = renderHook(() => useLoginRateLimiter());
    
    act(() => {
      result.current.recordAttempt(false);
      result.current.recordAttempt(false);
      result.current.recordAttempt(true); // Success
    });
    
    expect(result.current.remainingAttempts).toBe(5);
  });
});
```

---

## Store Tests

### Testing Zustand Stores

```typescript
// tests/component/stores/authStore.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.initialized).toBe(false);
  });

  it('sets user', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    
    useAuthStore.getState().setUser(mockUser);
    
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('resets state', () => {
    useAuthStore.getState().setUser({ id: '123' });
    useAuthStore.getState().setLoading(true);
    
    useAuthStore.getState().reset();
    
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
  });
});
```

---

## RLS Policy Tests

### Test Structure

```typescript
// tests/rls/family/families.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, createAuthenticatedClient } from '../../utils/testClient';
import { createTestFamily, cleanupTestFamily } from '../../utils/testFamilies';
import { createTestUser, cleanupTestUser } from '../../utils/testUsers';

describe('RLS: Families Table', () => {
  let testFamily: { id: string };
  let parentUser: { id: string; token: string };
  let otherUser: { id: string; token: string };

  beforeAll(async () => {
    // Create test data
    parentUser = await createTestUser({ role: 'parent' });
    otherUser = await createTestUser({ role: 'parent' });
    testFamily = await createTestFamily({ createdBy: parentUser.id });
  });

  afterAll(async () => {
    await cleanupTestFamily(testFamily.id);
    await cleanupTestUser(parentUser.id);
    await cleanupTestUser(otherUser.id);
  });

  describe('SELECT policies', () => {
    it('allows family members to view their family', async () => {
      const client = createAuthenticatedClient(parentUser.token);
      
      const { data, error } = await client
        .from('families')
        .select('*')
        .eq('id', testFamily.id);
      
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('prevents non-members from viewing family', async () => {
      const client = createAuthenticatedClient(otherUser.token);
      
      const { data, error } = await client
        .from('families')
        .select('*')
        .eq('id', testFamily.id);
      
      expect(error).toBeNull();
      expect(data).toHaveLength(0); // RLS filters out
    });
  });

  describe('UPDATE policies', () => {
    it('allows family creator to update', async () => {
      const client = createAuthenticatedClient(parentUser.token);
      
      const { error } = await client
        .from('families')
        .update({ family_name: 'Updated Name' })
        .eq('id', testFamily.id);
      
      expect(error).toBeNull();
    });

    it('prevents non-creators from updating', async () => {
      const client = createAuthenticatedClient(otherUser.token);
      
      const { error } = await client
        .from('families')
        .update({ family_name: 'Hacked' })
        .eq('id', testFamily.id);
      
      expect(error).not.toBeNull();
    });
  });
});
```

### Cross-Family Isolation Tests

```typescript
// tests/rls/cross-cutting/family-isolation.test.ts
import { describe, it, expect } from 'vitest';

describe('RLS: Cross-Family Isolation', () => {
  it('prevents access to other family chores', async () => {
    // Family A creates a chore
    const choreId = await createChore(familyA);
    
    // Family B tries to access it
    const client = createAuthenticatedClient(familyBUser.token);
    const { data } = await client
      .from('chores')
      .select('*')
      .eq('id', choreId);
    
    expect(data).toHaveLength(0);
  });

  it('prevents access to other family children', async () => {
    // Similar pattern for child_accounts table
  });

  it('isolates lesson progress by family', async () => {
    // Similar pattern for lesson_progress table
  });
});
```

---

## E2E Tests

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Auth Fixtures

```typescript
// tests-e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login as regular user
    await page.goto('/auth');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/parent-dashboard');
    
    await use(page);
  },
  
  adminPage: async ({ page }, use) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'adminpass123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
    
    await use(page);
  },
});
```

### Example E2E Test

```typescript
// tests-e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/auth');
    
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('validates required fields', async ({ page }) => {
    await page.goto('/auth');
    await page.click('button[type="submit"]');
    
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('handles invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[name="email"]', 'invalid@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'validpassword');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/dashboard/);
  });
});
```

---

## Test Utilities

### Test Client

```typescript
// tests/utils/testClient.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createTestClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export function createAuthenticatedClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}
```

### Custom Assertions

```typescript
// tests/utils/assertions.ts
import { expect } from 'vitest';

export function expectRLSError(error: unknown) {
  expect(error).not.toBeNull();
  expect(error).toMatchObject({
    code: expect.stringMatching(/^(42501|PGRST)/),
  });
}

export function expectNoAccess(data: unknown[]) {
  expect(data).toHaveLength(0);
}

export function expectSuccess(error: unknown, data: unknown) {
  expect(error).toBeNull();
  expect(data).not.toBeNull();
}
```

---

## Best Practices

### Test Organization

1. **One test file per component/feature**
2. **Descriptive test names** using `it('should...')`
3. **Group related tests** with `describe` blocks
4. **Use beforeEach/afterEach** for setup/cleanup

### Mocking Guidelines

```typescript
// ✅ Good: Mock at integration boundary
vi.mock('@/integrations/supabase/client');

// ❌ Bad: Mock internal implementation details
vi.mock('@/stores/authStore');
```

### Async Testing

```typescript
// ✅ Good: Use waitFor for async assertions
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// ❌ Bad: Arbitrary timeouts
await new Promise(r => setTimeout(r, 1000));
expect(screen.getByText('Loaded')).toBeInTheDocument();
```

### Test Data Management

1. **Create test data before tests**
2. **Clean up test data after tests**
3. **Use unique identifiers** to avoid conflicts
4. **Never modify production data**

---

## Coverage Requirements

| Category | Target | Current |
|----------|--------|---------|
| Statements | 80% | -- |
| Branches | 75% | -- |
| Functions | 80% | -- |
| Lines | 80% | -- |

### Critical Path Coverage

- Authentication flow: 90%+
- RLS policies: 100%
- Admin operations: 85%+
- Payment flows: 95%+

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial documentation |
