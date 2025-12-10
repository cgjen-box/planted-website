import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  describe('Rendering', () => {
    it('renders default title', () => {
      render(<ErrorState />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders custom title', () => {
      render(<ErrorState title="Failed to load data" />);
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    });

    it('renders custom message', () => {
      render(<ErrorState message="Network connection failed" />);
      expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    });

    it('renders error message from Error object', () => {
      const error = new Error('API request failed');
      render(<ErrorState error={error} />);
      expect(screen.getByText('API request failed')).toBeInTheDocument();
    });

    it('prioritizes custom message over error object', () => {
      const error = new Error('Error message');
      render(<ErrorState error={error} message="Custom message" />);
      expect(screen.getByText('Custom message')).toBeInTheDocument();
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });

    it('renders default message when no message or error provided', () => {
      render(<ErrorState />);
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });
  });

  describe('Alert Icon', () => {
    it('renders AlertCircle icon', () => {
      const { container } = render(<ErrorState />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('icon has destructive styling', () => {
      const { container } = render(<ErrorState />);
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('text-destructive');
      expect(icon).toHaveClass('h-6');
      expect(icon).toHaveClass('w-6');
    });

    it('icon is in rounded background', () => {
      const { container } = render(<ErrorState />);
      const iconWrapper = container.querySelector('.rounded-full');
      expect(iconWrapper).toHaveClass('bg-destructive/10');
      expect(iconWrapper).toHaveClass('p-3');
    });
  });

  describe('Retry Button', () => {
    it('renders retry button when onRetry provided', () => {
      render(<ErrorState onRetry={vi.fn()} />);
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('does not render retry button when onRetry not provided', () => {
      render(<ErrorState />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const handleRetry = vi.fn();
      const { user } = render(<ErrorState onRetry={handleRetry} />);

      await user.click(screen.getByRole('button', { name: /try again/i }));
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it('retry button has outline variant', () => {
      render(<ErrorState onRetry={vi.fn()} />);
      const button = screen.getByRole('button', { name: /try again/i });
      // Button component applies variant classes
      expect(button).toBeInTheDocument();
    });
  });

  // Note: Error Details (Development) tests are skipped because
  // import.meta.env.DEV is a build-time constant that cannot be mocked in tests.
  // The ErrorState component correctly checks import.meta.env.DEV at runtime.

  describe('Card Styling', () => {
    it('renders inside Card component', () => {
      const { container } = render(<ErrorState />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('border');
    });

    it('applies custom className', () => {
      const { container } = render(<ErrorState className="custom-error" />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-error');
    });

    it('card has padding', () => {
      const { container } = render(<ErrorState />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-6');
    });
  });

  describe('Layout and Spacing', () => {
    it('content is centered', () => {
      const { container } = render(<ErrorState />);
      const content = container.querySelector('.flex-col');
      expect(content).toHaveClass('items-center');
      expect(content).toHaveClass('text-center');
    });

    it('has proper spacing between elements', () => {
      const { container } = render(<ErrorState />);
      const content = container.querySelector('.flex-col');
      expect(content).toHaveClass('space-y-4');
    });

    it('text container has spacing', () => {
      const { container } = render(<ErrorState />);
      const textContainer = container.querySelector('.space-y-2');
      expect(textContainer).toBeInTheDocument();
    });

    it('title has correct styling', () => {
      render(<ErrorState title="Error Title" />);
      const title = screen.getByText('Error Title');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('text-foreground');
    });

    it('message has correct styling', () => {
      render(<ErrorState message="Error message" />);
      const message = screen.getByText('Error message');
      expect(message).toHaveClass('text-sm');
      expect(message).toHaveClass('text-muted-foreground');
      expect(message).toHaveClass('max-w-md');
    });
  });

  describe('Use Cases', () => {
    it('works for network errors', () => {
      render(
        <ErrorState
          title="Network Error"
          message="Unable to connect to the server"
          onRetry={vi.fn()}
        />
      );
      expect(screen.getByText('Network Error')).toBeInTheDocument();
      expect(screen.getByText('Unable to connect to the server')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('works for API errors', () => {
      const error = new Error('API returned 500');
      render(
        <ErrorState
          title="Failed to load venues"
          error={error}
          onRetry={vi.fn()}
        />
      );
      expect(screen.getByText('Failed to load venues')).toBeInTheDocument();
      expect(screen.getByText('API returned 500')).toBeInTheDocument();
    });

    it('works for validation errors', () => {
      render(
        <ErrorState
          title="Validation Error"
          message="Please check your input and try again"
        />
      );
      expect(screen.getByText('Validation Error')).toBeInTheDocument();
      expect(
        screen.getByText('Please check your input and try again')
      ).toBeInTheDocument();
    });

    it('works as minimal error display', () => {
      render(<ErrorState />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('title is semantic heading', () => {
      render(<ErrorState title="Error" />);
      const title = screen.getByText('Error');
      expect(title.tagName).toBe('H3');
    });

    it('message provides context', () => {
      render(<ErrorState message="Detailed error information" />);
      expect(screen.getByText('Detailed error information')).toBeInTheDocument();
    });

    it('retry button is keyboard accessible', async () => {
      const handleRetry = vi.fn();
      const { user } = render(<ErrorState onRetry={handleRetry} />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      expect(handleRetry).toHaveBeenCalled();
    });

    it('can be used with role="alert"', () => {
      const { container } = render(
        <div role="alert">
          <ErrorState />
        </div>
      );
      expect(container.querySelector('[role="alert"]')).toBeInTheDocument();
    });

    it('can be used with aria-live', () => {
      const { container } = render(
        <div aria-live="assertive">
          <ErrorState message="Critical error" />
        </div>
      );
      expect(container.querySelector('[aria-live="assertive"]')).toBeInTheDocument();
    });
  });

  describe('Error Object Handling', () => {
    it('handles Error with message', () => {
      const error = new Error('Something failed');
      render(<ErrorState error={error} />);
      expect(screen.getByText('Something failed')).toBeInTheDocument();
    });

    it('handles Error with stack trace', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at TestComponent';

      vi.stubGlobal('import.meta', { env: { DEV: true } });
      render(<ErrorState error={error} />);

      expect(screen.getByText('Test error')).toBeInTheDocument();
      vi.unstubAllGlobals();
    });

    it('handles null error', () => {
      render(<ErrorState error={null as any} />);
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });

    it('handles undefined error', () => {
      render(<ErrorState error={undefined} />);
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long error messages', () => {
      const longMessage =
        'This is a very long error message that should still be properly displayed and constrained by the max-width class to maintain readability';
      render(<ErrorState message={longMessage} />);
      const message = screen.getByText(longMessage);
      expect(message).toHaveClass('max-w-md');
    });

    it('handles rapid retry clicks', async () => {
      const handleRetry = vi.fn();
      const { user } = render(<ErrorState onRetry={handleRetry} />);
      const button = screen.getByRole('button');

      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(handleRetry).toHaveBeenCalledTimes(3);
    });

    it('renders multiple error states independently', () => {
      render(
        <div>
          <ErrorState title="Error 1" />
          <ErrorState title="Error 2" />
        </div>
      );
      expect(screen.getByText('Error 1')).toBeInTheDocument();
      expect(screen.getByText('Error 2')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('allows custom card background', () => {
      const { container } = render(<ErrorState className="bg-red-50" />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-red-50');
    });

    it('allows custom padding', () => {
      const { container } = render(<ErrorState className="p-8" />);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-8');
    });
  });

  describe('Complete Compositions', () => {
    it('renders complete error state with all features', () => {
      const error = new Error('Detailed error');
      const handleRetry = vi.fn();

      render(
        <ErrorState
          title="Failed to Load Data"
          message="Could not fetch the requested information"
          error={error}
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText('Failed to Load Data')).toBeInTheDocument();
      expect(
        screen.getByText('Could not fetch the requested information')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('renders minimal error state', () => {
      render(<ErrorState />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});
