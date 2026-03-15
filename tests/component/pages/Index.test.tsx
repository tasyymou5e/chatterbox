import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test-utils';
import Index from '@/pages/Index';

// Mock useSiteSettings hook
vi.mock('@/hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    settings: { parent_signup_enabled: true },
    loading: false,
  }),
}));

// Mock SiteHeader (named export)
vi.mock('@/components/SiteHeader', () => ({
  SiteHeader: () => <header data-testid="site-header">Header</header>,
}));

// Mock Hero (named export)
vi.mock('@/components/Hero', () => ({
  Hero: () => <section data-testid="hero">Hero Section</section>,
}));

// Mock PortalSelection (named export)
vi.mock('@/components/PortalSelection', () => ({
  PortalSelection: () => <section data-testid="portal-selection">Portal Selection</section>,
}));

describe('Index Page', () => {
  it('renders the page structure', () => {
    render(<Index />);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
    expect(screen.getByTestId('hero')).toBeInTheDocument();
  });

  it('renders the footer with navigation links', () => {
    render(<Index />);
    expect(screen.getByText(/Educational Games/i)).toBeInTheDocument();
    expect(screen.getByText(/Help Center/i)).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy/i)).toBeInTheDocument();
  });

  it('renders quick links section', () => {
    render(<Index />);
    expect(screen.getByText(/Quick Links/i)).toBeInTheDocument();
  });

  it('renders social section placeholder', () => {
    render(<Index />);
    expect(screen.getByText(/Connect/i)).toBeInTheDocument();
  });
});
