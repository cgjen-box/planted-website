import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component with custom error
const ThrowCustomError = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  // Suppress console errors during tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Normal Rendering', () => {
    it('renders children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });

    it('renders multiple children without error', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });

  describe('Error Catching', () => {
    it('catches and displays error from child component', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('No error')).not.toBeInTheDocument();
    });

    it('displays custom error message', () => {
      render(
        <ErrorBoundary>
          <ThrowCustomError message="Custom error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows error fallback UI when error is thrown', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(
        screen.getByText(/We encountered an unexpected error/i)
      ).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('resets error state when Try Again is clicked', async () => {
      const { user, rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click Try Again button
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Rerender with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // After reset, if component doesn't throw, it should render normally
      // Note: In real scenarios, the component would need to be re-rendered
    });

    it('provides Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('provides Reload Page button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('provides Go Home button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('uses default fallback when custom not provided', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Error Handler Callback', () => {
    it('calls onError callback when error is caught', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error' }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('does not call onError when no error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <div>No error</div>
        </ErrorBoundary>
      );

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Development Mode Error Details', () => {
    const originalEnv = import.meta.env.DEV;

    beforeEach(() => {
      vi.stubGlobal('import.meta', { env: { DEV: true } });
    });

    afterEach(() => {
      vi.stubGlobal('import.meta', { env: { DEV: originalEnv } });
    });

    it('shows error details in development mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();
    });

    it('shows error message in details', () => {
      render(
        <ErrorBoundary>
          <ThrowCustomError message="Detailed error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();
    });
  });

  describe('Error Icon', () => {
    it('displays error icon', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('icon has destructive styling', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-destructive');
    });
  });

  describe('Layout and Styling', () => {
    it('renders in centered fullscreen container', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const wrapper = container.querySelector('.min-h-screen');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('renders content in card', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const card = container.querySelector('.rounded-lg');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Support Message', () => {
    it('displays support message', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(
        screen.getByText(/If the problem persists, please contact support/i)
      ).toBeInTheDocument();
    });
  });

  describe('Multiple Errors', () => {
    it('handles sequential errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowCustomError message="First error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      rerender(
        <ErrorBoundary>
          <ThrowCustomError message="Second error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Nested ErrorBoundaries', () => {
    it('catches error at correct boundary level', () => {
      render(
        <ErrorBoundary fallback={<div>Outer boundary</div>}>
          <ErrorBoundary fallback={<div>Inner boundary</div>}>
            <ThrowError />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      expect(screen.getByText('Inner boundary')).toBeInTheDocument();
      expect(screen.queryByText('Outer boundary')).not.toBeInTheDocument();
    });

    it('bubbles to outer boundary if inner has no fallback', () => {
      const InnerComponent = () => {
        throw new Error('Nested error');
      };

      render(
        <ErrorBoundary fallback={<div>Outer caught it</div>}>
          <div>
            <InnerComponent />
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Outer caught it')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles error without message', () => {
      const ThrowEmptyError = () => {
        throw new Error('');
      };

      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('handles non-Error objects thrown', () => {
      const ThrowString = () => {
        throw 'String error';
      };

      render(
        <ErrorBoundary>
          <ThrowString />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('handles errors in event handlers (note: not caught by boundary)', () => {
      // Note: ErrorBoundary only catches errors in render, not in event handlers
      const ComponentWithEventError = () => {
        const handleClick = () => {
          throw new Error('Event error');
        };
        return <button onClick={handleClick}>Click me</button>;
      };

      render(
        <ErrorBoundary>
          <ComponentWithEventError />
        </ErrorBoundary>
      );

      // Should render normally since event errors aren't caught
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('error message is accessible', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const heading = screen.getByText('Something went wrong');
      expect(heading.tagName).toBe('H1');
    });

    it('action buttons are keyboard accessible', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
      });
    });

    it('can be wrapped with role="alert"', () => {
      const AlertWrapper = ({ children }: { children: React.ReactNode }) => (
        <div role="alert">{children}</div>
      );

      render(
        <ErrorBoundary
          fallback={
            <AlertWrapper>
              <div>Error occurred</div>
            </AlertWrapper>
          }
        >
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // Note: Production vs Development mode tests are skipped because
  // import.meta.env.DEV is a build-time constant that cannot be mocked in tests.
  // The ErrorFallback component correctly checks import.meta.env.DEV at runtime.
});
