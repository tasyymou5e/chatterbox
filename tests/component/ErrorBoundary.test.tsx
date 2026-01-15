import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';

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
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

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
    expect(screen.getByText(/TestComponent/)).toBeInTheDocument();
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

    // Find and click the retry button
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    // After clicking retry, we need to re-render with working component
    rerender(
      <ErrorBoundary componentName="Test">
        <SuccessComponent />
      </ErrorBoundary>
    );

    // Now click retry
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

    // Child boundary should catch the error
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Child/)).toBeInTheDocument();
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
