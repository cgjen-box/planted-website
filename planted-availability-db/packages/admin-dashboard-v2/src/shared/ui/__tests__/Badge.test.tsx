import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Badge } from '../Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('renders with text content', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('renders as div element', () => {
      const { container } = render(<Badge>Badge</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge.tagName).toBe('DIV');
    });

    it('renders with children', () => {
      render(
        <Badge>
          <span>Complex Badge</span>
        </Badge>
      );
      expect(screen.getByText('Complex Badge')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      const { container } = render(<Badge>Default</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-primary');
      expect(badge).toHaveClass('text-primary-foreground');
    });

    it('renders secondary variant', () => {
      const { container } = render(<Badge variant="secondary">Secondary</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-secondary');
      expect(badge).toHaveClass('text-secondary-foreground');
    });

    it('renders destructive variant', () => {
      const { container } = render(<Badge variant="destructive">Error</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-destructive');
      expect(badge).toHaveClass('text-destructive-foreground');
    });

    it('renders success variant', () => {
      const { container } = render(<Badge variant="success">Success</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-green-500');
      expect(badge).toHaveClass('text-white');
    });

    it('renders warning variant', () => {
      const { container } = render(<Badge variant="warning">Warning</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-yellow-500');
      expect(badge).toHaveClass('text-white');
    });

    it('renders outline variant', () => {
      const { container } = render(<Badge variant="outline">Outline</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('text-foreground');
    });
  });

  describe('Base Styling', () => {
    it('applies base badge styles', () => {
      const { container } = render(<Badge>Badge</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('border');
      expect(badge).toHaveClass('px-2.5');
      expect(badge).toHaveClass('py-0.5');
      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('font-semibold');
    });

    it('has focus styles', () => {
      const { container } = render(<Badge>Focus</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('focus:outline-none');
      expect(badge).toHaveClass('focus:ring-2');
      expect(badge).toHaveClass('focus:ring-ring');
    });
  });

  describe('Custom Styling', () => {
    it('merges custom className with base classes', () => {
      const { container } = render(<Badge className="custom-badge">Badge</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('custom-badge');
      expect(badge).toHaveClass('inline-flex');
    });

    it('allows custom className to override styles', () => {
      const { container } = render(<Badge className="bg-purple-500">Badge</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-purple-500');
    });

    it('combines variant with custom className', () => {
      const { container } = render(
        <Badge variant="success" className="uppercase">
          Custom
        </Badge>
      );
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-green-500');
      expect(badge).toHaveClass('uppercase');
    });
  });

  describe('HTML Attributes', () => {
    it('supports data attributes', () => {
      render(
        <Badge data-testid="test-badge" data-status="active">
          Test
        </Badge>
      );
      const badge = screen.getByTestId('test-badge');
      expect(badge).toHaveAttribute('data-status', 'active');
    });

    it('supports id attribute', () => {
      render(<Badge id="unique-badge">Badge</Badge>);
      const badge = screen.getByText('Badge');
      expect(badge).toHaveAttribute('id', 'unique-badge');
    });

    it('supports onClick handler', () => {
      const handleClick = vi.fn();
      const { container } = render(<Badge onClick={handleClick}>Clickable</Badge>);
      const badge = container.firstChild as HTMLElement;
      badge.click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('supports role attribute', () => {
      render(<Badge role="status">Status Badge</Badge>);
      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });

    it('supports aria-label', () => {
      render(<Badge aria-label="New notification">5</Badge>);
      const badge = screen.getByLabelText('New notification');
      expect(badge).toBeInTheDocument();
    });

    it('supports aria-live for dynamic updates', () => {
      render(<Badge aria-live="polite">Live Update</Badge>);
      const badge = screen.getByText('Live Update');
      expect(badge).toHaveAttribute('aria-live', 'polite');
    });

    it('can be used as status indicator', () => {
      render(
        <div>
          <span id="label">Connection Status:</span>
          <Badge role="status" aria-labelledby="label">
            Connected
          </Badge>
        </div>
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Content Types', () => {
    it('renders with icon', () => {
      render(
        <Badge>
          <svg data-testid="icon" />
          With Icon
        </Badge>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('renders with only icon', () => {
      render(
        <Badge aria-label="Close">
          <svg data-testid="close-icon" />
        </Badge>
      );
      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });

    it('renders with number', () => {
      render(<Badge>42</Badge>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders with complex children', () => {
      render(
        <Badge>
          <span className="font-bold">Bold</span>
          <span> Regular</span>
        </Badge>
      );
      expect(screen.getByText('Bold')).toBeInTheDocument();
      expect(screen.getByText('Regular')).toBeInTheDocument();
    });
  });

  describe('Use Cases', () => {
    it('works as notification badge', () => {
      render(
        <div>
          <span>Notifications</span>
          <Badge variant="destructive" aria-label="5 unread notifications">
            5
          </Badge>
        </div>
      );
      expect(screen.getByLabelText('5 unread notifications')).toHaveTextContent('5');
    });

    it('works as status indicator', () => {
      const { container } = render(<Badge variant="success">Active</Badge>);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass('bg-green-500');
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('works as tag/label', () => {
      render(<Badge variant="outline">TypeScript</Badge>);
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });

    it('works as category badge', () => {
      render(
        <div>
          <Badge variant="secondary">Food</Badge>
          <Badge variant="secondary">Vegan</Badge>
          <Badge variant="secondary">Organic</Badge>
        </div>
      );
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('Vegan')).toBeInTheDocument();
      expect(screen.getByText('Organic')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('renders with empty content', () => {
      const { container } = render(<Badge />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders with very long text', () => {
      const longText = 'This is a very long badge text that might wrap';
      render(<Badge>{longText}</Badge>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('renders multiple badges in a row', () => {
      render(
        <div>
          <Badge variant="default">Badge 1</Badge>
          <Badge variant="secondary">Badge 2</Badge>
          <Badge variant="destructive">Badge 3</Badge>
        </div>
      );
      expect(screen.getByText('Badge 1')).toBeInTheDocument();
      expect(screen.getByText('Badge 2')).toBeInTheDocument();
      expect(screen.getByText('Badge 3')).toBeInTheDocument();
    });
  });
});
