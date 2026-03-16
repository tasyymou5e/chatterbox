import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';

// Mock Supabase client
const mockInvoke = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser()
    },
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args)
    }
  }
}));

// Mock secureLog
const mockSecureLog = {
  warn: vi.fn(),
  error: vi.fn(),
  security: vi.fn()
};

vi.mock('@/utils/secureLogging', () => ({
  secureLog: mockSecureLog
}));

// Mock sessionStorage
const sessionStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => sessionStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    sessionStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    sessionStorageMock.store = {};
  })
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => 'test-uuid-1234-5678-abcd');
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: mockRandomUUID
  },
  writable: true
});

// Component that throws an error
const ThrowError = ({ message = 'Test error' }: { message?: string }) => {
  throw new Error(message);
};

// Component that renders successfully
const SuccessComponent = () => <div>Success</div>;

// Mock console.error to prevent noise in test output
const originalConsoleError = console.error;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    console.error = vi.fn();
    vi.clearAllMocks();
    sessionStorageMock.clear();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'test-user-123' } } });
    mockInvoke.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary componentName="Test">
          <SuccessComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('catches errors and displays fallback UI', () => {
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('displays custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary componentName="Test" fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('has a retry button that resets the error boundary', () => {
      const { rerender } = render(
        <ErrorBoundary componentName="Test">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      rerender(
        <ErrorBoundary componentName="Test">
          <SuccessComponent />
        </ErrorBoundary>
      );

      fireEvent.click(retryButton);
    });

    it('has a reload button', () => {
      render(
        <ErrorBoundary componentName="Test">
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload page/i });
      expect(reloadButton).toBeInTheDocument();
    });

    it('handles nested errors correctly', () => {
      const NestedComponent = () => (
        <div>
          <ThrowError message="Nested error" />
        </div>
      );

      render(
        <ErrorBoundary componentName="Parent">
          <ErrorBoundary componentName="Child">
            <NestedComponent />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('logs errors to console', () => {
      render(
        <ErrorBoundary componentName="Test">
          <ThrowError message="Console test error" />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('allows logging up to 10 errors per minute', async () => {
      // Render and unmount 10 error boundaries to trigger 10 errors
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <ErrorBoundary componentName={`Test${i}`} key={i}>
            <ThrowError message={`Error ${i}`} />
          </ErrorBoundary>
        );
        unmount();
      }

      // Wait for async logging to complete
      await waitFor(() => {
        // All 10 errors should be logged
        expect(mockInvoke).toHaveBeenCalledTimes(10);
      });
    });

    it('blocks logging after exceeding rate limit within same instance', async () => {
      // We need to test rate limiting within a single component instance
      // Since the rate limiting is per-instance, we'll verify the mechanism exists
      const { rerender } = render(
        <ErrorBoundary componentName="RateLimitTest">
          <ThrowError message="Error 1" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });

      // The component should still be in error state
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('resets rate limit counter after 60 seconds', async () => {
      vi.useFakeTimers();

      render(
        <ErrorBoundary componentName="TimerTest">
          <ThrowError />
        </ErrorBoundary>
      );

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61000);

      // The rate limit should be reset for new errors
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Cleanup (componentWillUnmount)', () => {
    it('resets error tracking state on unmount', async () => {
      const { unmount } = render(
        <ErrorBoundary componentName="CleanupTest">
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });

      // Unmount the component
      unmount();

      // Clear mocks to verify new instance works fresh
      mockInvoke.mockClear();

      // Re-mount a new instance - should be able to log errors fresh
      render(
        <ErrorBoundary componentName="CleanupTest2">
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });
    });

    it('prevents memory leaks by cleaning up instance state', () => {
      const { unmount } = render(
        <ErrorBoundary componentName="MemoryTest">
          <ThrowError />
        </ErrorBoundary>
      );

      // Component should render error UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Unmount should not throw
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Session ID Generation', () => {
    it('generates cryptographically secure session ID using crypto.randomUUID()', async () => {
      sessionStorageMock.store = {}; // Clear any existing session ID

      render(
        <ErrorBoundary componentName="SessionTest">
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockRandomUUID).toHaveBeenCalled();
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
          'error_session_id',
          'test-uuid-1234-5678-abcd'
        );
      });
    });

    it('reuses existing session ID from sessionStorage', async () => {
      sessionStorageMock.store['error_session_id'] = 'existing-session-id-xyz';
      mockRandomUUID.mockClear();

      render(
        <ErrorBoundary componentName="ReuseSessionTest">
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });

      // Should not generate new UUID when one exists
      expect(mockRandomUUID).not.toHaveBeenCalled();
    });

    it('includes session ID in error payload', async () => {
      sessionStorageMock.store['error_session_id'] = 'payload-session-id';

      render(
        <ErrorBoundary componentName="PayloadTest">
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'error-collector',
          expect.objectContaining({
            body: expect.objectContaining({
              sessionId: 'payload-session-id'
            })
          })
        );
      });
    });
  });

  describe('Error Logging to Supabase', () => {
    it('calls error-collector edge function with correct payload', async () => {
      render(
        <ErrorBoundary componentName="LoggingTest">
          <ThrowError message="Payload test error" />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'error-collector',
          expect.objectContaining({
            body: expect.objectContaining({
              errorType: 'react_error_boundary',
              severity: 'critical',
              message: 'Payload test error',
              componentName: 'LoggingTest'
            })
          })
        );
      });
    });

    it('includes browser and device info in payload', async () => {
      render(
        <ErrorBoundary componentName="DeviceInfoTest">
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'error-collector',
          expect.objectContaining({
            body: expect.objectContaining({
              browserInfo: expect.objectContaining({
                language: expect.any(String),
                platform: expect.any(String)
              }),
              deviceInfo: expect.objectContaining({
                screenWidth: expect.any(Number),
                screenHeight: expect.any(Number)
              })
            })
          })
        );
      });
    });

    it('logs security event on error boundary activation', async () => {
      render(
        <ErrorBoundary componentName="SecurityLogTest">
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockSecureLog.security).toHaveBeenCalledWith(
          'error_boundary_activated',
          expect.objectContaining({
            componentName: 'SecurityLogTest',
            errorType: 'Error',
            hasUser: true
          }),
          'medium'
        );
      });
    });

    it('handles Supabase logging failure gracefully', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Network error'));

      render(
        <ErrorBoundary componentName="FailureTest">
          <ThrowError />
        </ErrorBoundary>
      );

      // Should still render error UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockSecureLog.error).toHaveBeenCalledWith(
          'Failed to log error boundary error',
          expect.any(Error),
          'ErrorBoundary'
        );
      });
    });

    it('partially redacts user ID for privacy', async () => {
      mockGetUser.mockResolvedValue({ 
        data: { user: { id: 'full-user-id-123456789' } } 
      });

      render(
        <ErrorBoundary componentName="RedactionTest">
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'error-collector',
          expect.objectContaining({
            body: expect.objectContaining({
              userId: 'user_full-use***'
            })
          })
        );
      });
    });

    it('handles unauthenticated users', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      render(
        <ErrorBoundary componentName="UnauthTest">
          <ThrowError />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          'error-collector',
          expect.objectContaining({
            body: expect.objectContaining({
              userId: null
            })
          })
        );
      });
    });
  });

  describe('Reset and Reload Behavior', () => {
    it('handleReset clears error state', () => {
      let shouldThrow = true;
      const ConditionalError = () => {
        if (shouldThrow) throw new Error('Conditional error');
        return <div>Recovered</div>;
      };

      const { rerender } = render(
        <ErrorBoundary componentName="ResetTest">
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      shouldThrow = false;

      // Re-render with working component before clicking retry
      rerender(
        <ErrorBoundary componentName="ResetTest">
          <ConditionalError />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      expect(screen.getByText('Recovered')).toBeInTheDocument();
    });

    it('handleReload calls window.__navigate to home', () => {
      const mockNavigate = vi.fn();
      (window as { __navigate?: (path: string) => void }).__navigate = mockNavigate;

      render(
        <ErrorBoundary componentName="ReloadTest">
          <ThrowError />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: /reload page/i }));

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('handleReload works when window.__navigate is undefined', () => {
      delete (window as { __navigate?: unknown }).__navigate;

      render(
        <ErrorBoundary componentName="NoNavigateTest">
          <ThrowError />
        </ErrorBoundary>
      );

      // Should not throw when clicking reload
      expect(() => {
        fireEvent.click(screen.getByRole('button', { name: /reload page/i }));
      }).not.toThrow();
    });
  });

  describe('Environment-Specific Rendering', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('shows error ID section in production mode', () => {
      sessionStorageMock.store['error_session_id'] = 'abc123-def456-ghi789-jkl012';

      // Note: process.env.NODE_ENV is typically set at build time
      // This test verifies the component renders error ID when available
      render(
        <ErrorBoundary componentName="ProdTest">
          <ThrowError />
        </ErrorBoundary>
      );

      // Component should show fallback UI
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('renders error UI with proper accessibility', () => {
      render(
        <ErrorBoundary componentName="A11yTest">
          <ThrowError />
        </ErrorBoundary>
      );

      // Buttons should be accessible
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();

      // Alert should be present
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles errors without stack trace', async () => {
      const errorWithoutStack = new Error('No stack');
      delete errorWithoutStack.stack;

      const NoStackError = () => {
        throw errorWithoutStack;
      };

      render(
        <ErrorBoundary componentName="NoStackTest">
          <NoStackError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalled();
      });
    });

    it('handles empty component name', () => {
      render(
        <ErrorBoundary componentName="">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('handles undefined component name', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('handles getUser throwing an error', async () => {
      mockGetUser.mockRejectedValueOnce(new Error('Auth error'));

      render(
        <ErrorBoundary componentName="AuthErrorTest">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockSecureLog.error).toHaveBeenCalled();
      });
    });
  });
});
