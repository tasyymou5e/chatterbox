import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Auth from '@/pages/Auth';

// Mock useAuth hook - sessionReady must be true to show tabs
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    resetPassword: mockResetPassword,
    loading: false,
    user: null,
    session: null,
    userRole: null,
    sessionReady: true,
  }),
}));

// Mock useSiteSettings
vi.mock('@/hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    settings: { parent_signup_enabled: true },
    loading: false,
  }),
}));

// Mock useAuthNavigation
vi.mock('@/hooks/useAuthNavigation', () => ({
  useAuthNavigation: vi.fn(),
}));

// Mock utils
vi.mock('@/utils/authHelpers', () => ({
  getDashboardPath: vi.fn(() => '/parent-dashboard'),
}));

describe('Auth Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders signup and signin tabs', () => {
    render(<Auth />);
    expect(screen.getByRole('tab', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /sign in/i })).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<Auth />);
    
    // Click sign in tab
    await user.click(screen.getByRole('tab', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /sign in/i })).toHaveAttribute('data-state', 'active');
    });
  });
});
