import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Auth from '@/pages/Auth';

// Mock useAuth hook
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    resetPassword: mockResetPassword,
    isLoading: false,
  }),
}));

// Mock useSiteSettings
vi.mock('@/hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    settings: { parent_signup_enabled: true },
    loading: false,
  }),
}));

// Mock SiteHeader
vi.mock('@/components/SiteHeader', () => ({
  default: () => <header data-testid="site-header">Header</header>,
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
      // Sign in tab should be selected
      expect(screen.getByRole('tab', { name: /sign in/i })).toHaveAttribute('data-state', 'active');
    });
  });

  it('displays email input field', () => {
    render(<Auth />);
    expect(screen.getAllByLabelText(/email/i).length).toBeGreaterThan(0);
  });

  it('displays password input field', () => {
    render(<Auth />);
    expect(screen.getAllByLabelText(/password/i).length).toBeGreaterThan(0);
  });

  it('shows forgot password link on signin tab', async () => {
    const user = userEvent.setup();
    render(<Auth />);
    
    await user.click(screen.getByRole('tab', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });
  });
});
