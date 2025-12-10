import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { EmptyState } from '../EmptyState';
import { Database, Search, FileText } from 'lucide-react';

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('renders title', () => {
      render(<EmptyState title="No results found" />);
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('renders title as h3', () => {
      render(<EmptyState title="Empty" />);
      const title = screen.getByText('Empty');
      expect(title.tagName).toBe('H3');
    });

    it('renders description when provided', () => {
      render(
        <EmptyState
          title="No venues"
          description="Start by adding your first venue"
        />
      );
      expect(screen.getByText('Start by adding your first venue')).toBeInTheDocument();
    });

    it('renders without description', () => {
      render(<EmptyState title="No data" />);
      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
      const { container } = render(<EmptyState icon={Database} title="No data" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders without icon', () => {
      const { container } = render(<EmptyState title="No data" />);
      const icon = container.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Action Button', () => {
    it('renders action button when provided', () => {
      render(
        <EmptyState
          title="No venues"
          action={{ label: 'Add Venue', onClick: vi.fn() }}
        />
      );
      expect(screen.getByRole('button', { name: /add venue/i })).toBeInTheDocument();
    });

    it('calls onClick when action button is clicked', async () => {
      const handleClick = vi.fn();
      const { user } = render(
        <EmptyState
          title="No data"
          action={{ label: 'Add Item', onClick: handleClick }}
        />
      );

      await user.click(screen.getByRole('button', { name: /add item/i }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders without action button', () => {
      render(<EmptyState title="No data" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Icon Styling', () => {
    it('wraps icon in rounded container', () => {
      const { container } = render(<EmptyState icon={Search} title="No results" />);
      const iconWrapper = container.querySelector('.rounded-full');
      expect(iconWrapper).toBeInTheDocument();
      expect(iconWrapper).toHaveClass('bg-muted');
      expect(iconWrapper).toHaveClass('p-4');
    });

    it('icon has correct size classes', () => {
      const { container } = render(<EmptyState icon={Database} title="No data" />);
      const icon = container.querySelector('svg');
      expect(icon).toHaveClass('h-8');
      expect(icon).toHaveClass('w-8');
      expect(icon).toHaveClass('text-muted-foreground');
    });
  });

  describe('Layout Styling', () => {
    it('applies container styles', () => {
      const { container } = render(<EmptyState title="Empty" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-col');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
      expect(wrapper).toHaveClass('py-12');
      expect(wrapper).toHaveClass('text-center');
    });

    it('title has correct styling', () => {
      render(<EmptyState title="No data" />);
      const title = screen.getByText('No data');
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('text-foreground');
    });

    it('description has correct styling', () => {
      render(<EmptyState title="Empty" description="No items found" />);
      const description = screen.getByText('No items found');
      expect(description).toHaveClass('text-sm');
      expect(description).toHaveClass('text-muted-foreground');
      expect(description).toHaveClass('max-w-md');
    });

    it('applies custom className', () => {
      const { container } = render(
        <EmptyState title="Empty" className="custom-empty" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-empty');
    });
  });

  describe('Content Spacing', () => {
    it('has proper spacing between elements', () => {
      const { container } = render(
        <EmptyState
          icon={Database}
          title="No data"
          description="Add some data"
          action={{ label: 'Add', onClick: vi.fn() }}
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('gap-4');
    });

    it('text container has spacing', () => {
      const { container } = render(
        <EmptyState title="No data" description="Description" />
      );
      const textContainer = container.querySelector('.space-y-2');
      expect(textContainer).toBeInTheDocument();
    });

    it('action button has top margin', () => {
      render(
        <EmptyState
          title="Empty"
          action={{ label: 'Action', onClick: vi.fn() }}
        />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('mt-2');
    });
  });

  describe('Use Cases', () => {
    it('works for empty search results', () => {
      render(
        <EmptyState
          icon={Search}
          title="No results found"
          description="Try adjusting your search criteria"
        />
      );
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your search criteria')
      ).toBeInTheDocument();
    });

    it('works for empty list', () => {
      render(
        <EmptyState
          icon={Database}
          title="No venues found"
          description="Start by adding your first venue"
          action={{ label: 'Add Venue', onClick: vi.fn() }}
        />
      );
      expect(screen.getByRole('button', { name: /add venue/i })).toBeInTheDocument();
    });

    it('works for filtered results', () => {
      render(
        <EmptyState
          icon={FileText}
          title="No matching items"
          description="No items match your current filters"
        />
      );
      expect(screen.getByText('No matching items')).toBeInTheDocument();
    });

    it('works as minimal empty state', () => {
      render(<EmptyState title="No data available" />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('title is accessible', () => {
      render(<EmptyState title="No results" />);
      const title = screen.getByText('No results');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H3');
    });

    it('description provides additional context', () => {
      render(
        <EmptyState
          title="Empty"
          description="This list is currently empty. Add items to get started."
        />
      );
      const description = screen.getByText(
        'This list is currently empty. Add items to get started.'
      );
      expect(description).toBeInTheDocument();
    });

    it('action button is keyboard accessible', async () => {
      const handleClick = vi.fn();
      const { user } = render(
        <EmptyState
          title="Empty"
          action={{ label: 'Add Item', onClick: handleClick }}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });

    it('can be wrapped with role="region"', () => {
      const { container } = render(
        <div role="region" aria-label="Empty state">
          <EmptyState title="No data" />
        </div>
      );
      expect(container.querySelector('[role="region"]')).toBeInTheDocument();
    });
  });

  describe('Complete Compositions', () => {
    it('renders complete empty state with all parts', () => {
      const handleAdd = vi.fn();
      render(
        <EmptyState
          icon={Database}
          title="No venues found"
          description="You haven't added any venues yet. Get started by adding your first venue."
          action={{ label: 'Add Venue', onClick: handleAdd }}
        />
      );

      expect(screen.getByText('No venues found')).toBeInTheDocument();
      expect(
        screen.getByText(/You haven't added any venues yet/)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add venue/i })).toBeInTheDocument();
    });

    it('renders minimal empty state', () => {
      render(<EmptyState title="No data" />);
      expect(screen.getByText('No data')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders with icon and title only', () => {
      const { container } = render(<EmptyState icon={Search} title="No results" />);
      expect(screen.getByText('No results')).toBeInTheDocument();
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Different Icons', () => {
    it('renders with Database icon', () => {
      const { container } = render(<EmptyState icon={Database} title="No data" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders with Search icon', () => {
      const { container } = render(<EmptyState icon={Search} title="No results" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders with FileText icon', () => {
      const { container } = render(<EmptyState icon={FileText} title="No files" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long title', () => {
      const longTitle =
        'This is a very long title that might wrap to multiple lines in the UI';
      render(<EmptyState title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('handles very long description', () => {
      const longDescription =
        'This is a very long description text that should still be constrained by max-width and centered properly in the empty state component.';
      render(<EmptyState title="Empty" description={longDescription} />);
      const description = screen.getByText(longDescription);
      expect(description).toHaveClass('max-w-md');
    });

    it('handles multiple empty states on page', () => {
      render(
        <div>
          <EmptyState title="Empty 1" />
          <EmptyState title="Empty 2" />
          <EmptyState title="Empty 3" />
        </div>
      );
      expect(screen.getByText('Empty 1')).toBeInTheDocument();
      expect(screen.getByText('Empty 2')).toBeInTheDocument();
      expect(screen.getByText('Empty 3')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('allows custom background', () => {
      const { container } = render(
        <EmptyState title="Empty" className="bg-gray-50 rounded-lg p-8" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bg-gray-50');
      expect(wrapper).toHaveClass('rounded-lg');
    });

    it('allows custom padding', () => {
      const { container } = render(
        <EmptyState title="Empty" className="py-24" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('py-24');
    });
  });
});
