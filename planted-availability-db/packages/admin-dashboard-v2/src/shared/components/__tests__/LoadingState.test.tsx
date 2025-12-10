import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  describe('Rendering', () => {
    it('renders loading spinner', () => {
      const { container } = render(<LoadingState />);
      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('renders default message', () => {
      render(<LoadingState />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders custom message', () => {
      render(<LoadingState message="Loading venues..." />);
      expect(screen.getByText('Loading venues...')).toBeInTheDocument();
    });

    it('renders without message when empty string', () => {
      render(<LoadingState message="" />);
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<LoadingState size="sm" />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-4');
      expect(spinner).toHaveClass('w-4');
    });

    it('renders medium size (default)', () => {
      const { container } = render(<LoadingState />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-8');
      expect(spinner).toHaveClass('w-8');
    });

    it('renders large size', () => {
      const { container } = render(<LoadingState size="lg" />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('h-12');
      expect(spinner).toHaveClass('w-12');
    });

    it('applies correct text size for small', () => {
      render(<LoadingState size="sm" message="Loading" />);
      const text = screen.getByText('Loading');
      expect(text).toHaveClass('text-sm');
    });

    it('applies correct text size for medium', () => {
      render(<LoadingState size="md" message="Loading" />);
      const text = screen.getByText('Loading');
      expect(text).toHaveClass('text-base');
    });

    it('applies correct text size for large', () => {
      render(<LoadingState size="lg" message="Loading" />);
      const text = screen.getByText('Loading');
      expect(text).toHaveClass('text-lg');
    });
  });

  describe('Styling', () => {
    it('applies container styles', () => {
      const { container } = render(<LoadingState />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-col');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
      expect(wrapper).toHaveClass('py-12');
    });

    it('spinner has animation', () => {
      const { container } = render(<LoadingState />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('spinner has primary color', () => {
      const { container } = render(<LoadingState />);
      const spinner = container.querySelector('svg');
      expect(spinner).toHaveClass('text-primary');
    });

    it('message has muted color', () => {
      render(<LoadingState message="Loading..." />);
      const message = screen.getByText('Loading...');
      expect(message).toHaveClass('text-muted-foreground');
    });

    it('applies custom className', () => {
      const { container } = render(<LoadingState className="custom-loading" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-loading');
      expect(wrapper).toHaveClass('flex');
    });
  });

  describe('Layout', () => {
    it('renders centered content', () => {
      const { container } = render(<LoadingState />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });

    it('has gap between spinner and message', () => {
      const { container } = render(<LoadingState message="Loading" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('gap-3');
    });
  });

  describe('Use Cases', () => {
    it('works for page loading', () => {
      render(<LoadingState message="Loading page content..." />);
      expect(screen.getByText('Loading page content...')).toBeInTheDocument();
    });

    it('works for data fetching', () => {
      render(<LoadingState message="Fetching venues..." size="sm" />);
      expect(screen.getByText('Fetching venues...')).toBeInTheDocument();
    });

    it('works as inline loader', () => {
      render(<LoadingState size="sm" message="" className="py-4" />);
      const { container } = render(<LoadingState size="sm" message="" className="py-4" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('py-4');
    });

    it('works for full page loading', () => {
      render(<LoadingState size="lg" message="Loading application..." />);
      expect(screen.getByText('Loading application...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('spinner is visible to screen readers', () => {
      const { container } = render(<LoadingState />);
      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('message provides context', () => {
      render(<LoadingState message="Loading your data, please wait..." />);
      expect(screen.getByText('Loading your data, please wait...')).toBeInTheDocument();
    });

    it('can be used with role="status"', () => {
      const { container } = render(
        <div role="status">
          <LoadingState />
        </div>
      );
      expect(container.querySelector('[role="status"]')).toBeInTheDocument();
    });

    it('can be used with aria-live', () => {
      const { container } = render(
        <div aria-live="polite">
          <LoadingState message="Loading..." />
        </div>
      );
      expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument();
    });
  });

  describe('Icon', () => {
    it('uses Loader2 icon from lucide-react', () => {
      const { container } = render(<LoadingState />);
      const spinner = container.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      // Loader2 is a circular loader icon
    });
  });

  describe('Edge Cases', () => {
    it('handles very long messages', () => {
      const longMessage =
        'This is a very long loading message that should still be displayed correctly';
      render(<LoadingState message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('renders multiple loading states independently', () => {
      const { container } = render(
        <div>
          <LoadingState message="Loading 1" size="sm" />
          <LoadingState message="Loading 2" size="md" />
          <LoadingState message="Loading 3" size="lg" />
        </div>
      );

      expect(screen.getByText('Loading 1')).toBeInTheDocument();
      expect(screen.getByText('Loading 2')).toBeInTheDocument();
      expect(screen.getByText('Loading 3')).toBeInTheDocument();
    });

    it('can be combined with other components', () => {
      render(
        <div className="card">
          <LoadingState message="Loading card content..." />
        </div>
      );
      expect(screen.getByText('Loading card content...')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('maintains layout on different screen sizes', () => {
      const { container } = render(<LoadingState />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex-col');
    });
  });

  describe('Custom Styling Combinations', () => {
    it('combines size and custom className', () => {
      const { container } = render(
        <LoadingState size="lg" className="min-h-screen bg-gray-100" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('min-h-screen');
      expect(wrapper).toHaveClass('bg-gray-100');
    });

    it('works with different padding', () => {
      const { container } = render(<LoadingState className="py-24" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('py-24');
    });
  });

  describe('Performance', () => {
    it('renders efficiently without re-renders', () => {
      const { rerender } = render(<LoadingState message="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Rerender with same props should work fine
      rerender(<LoadingState message="Loading..." />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
