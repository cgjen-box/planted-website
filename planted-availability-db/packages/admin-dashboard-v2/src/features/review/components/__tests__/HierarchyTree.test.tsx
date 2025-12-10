/**
 * HierarchyTree Component Tests
 *
 * Tests for tree rendering, expand/collapse, keyboard navigation (j/k/h/l), and selection
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { HierarchyTree } from '../HierarchyTree';
import { mockHierarchy } from '@/test/mocks/data/venues';
import type { HierarchyNode } from '../../types';

describe('HierarchyTree', () => {
  const mockOnSelectVenue = vi.fn();

  const defaultProps = {
    hierarchy: mockHierarchy,
    onSelectVenue: mockOnSelectVenue,
  };

  beforeEach(() => {
    mockOnSelectVenue.mockClear();
  });

  describe('Rendering', () => {
    it('should render the hierarchy tree', () => {
      const { container } = render(<HierarchyTree {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should display country nodes', () => {
      render(<HierarchyTree {...defaultProps} />);
      expect(screen.getByText('Switzerland')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('Austria')).toBeInTheDocument();
    });

    it('should display counts for each node', () => {
      render(<HierarchyTree {...defaultProps} />);
      // Country counts
      expect(screen.getByText('2')).toBeInTheDocument(); // Switzerland count
    });

    it('should show empty state when no venues', () => {
      render(<HierarchyTree {...defaultProps} hierarchy={[]} />);
      expect(screen.getByText('No venues in queue')).toBeInTheDocument();
    });

    it('should render chevron icons for expandable nodes', () => {
      const { container } = render(<HierarchyTree {...defaultProps} />);
      const chevrons = container.querySelectorAll('[class*="lucide-chevron"]');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('should apply custom className', () => {
      const { container } = render(
        <HierarchyTree {...defaultProps} className="custom-class" />
      );
      const treeContainer = container.firstChild as HTMLElement;
      expect(treeContainer.className).toContain('custom-class');
    });
  });

  describe('Expand/Collapse', () => {
    it('should expand node when clicked', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const switzerlandNode = screen.getByText('Switzerland').closest('button')!;
      await user.click(switzerlandNode);

      await waitFor(() => {
        expect(screen.getByText('Restaurant')).toBeInTheDocument();
      });
    });

    it('should collapse expanded node when clicked again', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const switzerlandNode = screen.getByText('Switzerland').closest('button')!;

      // Expand
      await user.click(switzerlandNode);
      await waitFor(() => {
        expect(screen.getByText('Restaurant')).toBeInTheDocument();
      });

      // Collapse
      await user.click(switzerlandNode);
      await waitFor(() => {
        expect(screen.queryByText('Restaurant')).not.toBeInTheDocument();
      });
    });

    it('should expand nested nodes', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      // Expand country
      const switzerlandNode = screen.getByText('Switzerland').closest('button')!;
      await user.click(switzerlandNode);
      await waitFor(() => {
        expect(screen.getByText('Restaurant')).toBeInTheDocument();
      });

      // Expand venue type
      const restaurantNode = screen.getByText('Restaurant').closest('button')!;
      await user.click(restaurantNode);
      await waitFor(() => {
        expect(screen.getByText('Tibits')).toBeInTheDocument();
      });
    });

    it('should show chevron-down icon when expanded', async () => {
      const { user, container } = render(<HierarchyTree {...defaultProps} />);

      const switzerlandNode = screen.getByText('Switzerland').closest('button')!;
      await user.click(switzerlandNode);

      await waitFor(() => {
        const chevronDown = switzerlandNode.querySelector('[class*="lucide-chevron-down"]');
        expect(chevronDown).toBeInTheDocument();
      });
    });
  });

  describe('Venue Selection', () => {
    it('should call onSelectVenue when venue node is clicked', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      // Expand to venue level
      const switzerlandNode = screen.getByText('Switzerland').closest('button')!;
      await user.click(switzerlandNode);
      const restaurantNode = screen.getByText('Restaurant').closest('button')!;
      await user.click(restaurantNode);
      const tibitsChain = screen.getByText('Tibits').closest('button')!;
      await user.click(tibitsChain);

      await waitFor(() => {
        const venueNode = screen.getByText('Tibits Zurich').closest('button')!;
        user.click(venueNode);
      });

      await waitFor(() => {
        expect(mockOnSelectVenue).toHaveBeenCalledWith('venue-1');
      });
    });

    it('should highlight selected venue', async () => {
      const { user } = render(
        <HierarchyTree {...defaultProps} selectedVenueId="venue-1" />
      );

      // Expand to venue
      const switzerlandNode = screen.getByText('Switzerland').closest('button')!;
      await user.click(switzerlandNode);
      const restaurantNode = screen.getByText('Restaurant').closest('button')!;
      await user.click(restaurantNode);
      const tibitsChain = screen.getByText('Tibits').closest('button')!;
      await user.click(tibitsChain);

      await waitFor(() => {
        const venueButton = screen.getByText('Tibits Zurich').closest('button')!;
        expect(venueButton.className).toContain('primary');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate down with j key', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      // Focus the tree container
      const container = screen.getByText('Switzerland').closest('div[tabindex="-1"]')!;
      container.focus();

      // Press j to move down
      await user.keyboard('j');

      // The focus should move to the next node (Germany)
      await waitFor(() => {
        const germanyNode = screen.getByText('Germany').closest('button')!;
        expect(germanyNode.className).toContain('ring-2');
      });
    });

    it('should navigate down with ArrowDown key', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const container = screen.getByText('Switzerland').closest('div[tabindex="-1"]')!;
      container.focus();

      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        const germanyNode = screen.getByText('Germany').closest('button')!;
        expect(germanyNode.className).toContain('ring-2');
      });
    });

    it('should navigate up with k key', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const container = screen.getByText('Switzerland').closest('div[tabindex="-1"]')!;
      container.focus();

      // Move down then up
      await user.keyboard('j');
      await user.keyboard('k');

      await waitFor(() => {
        const switzerlandNode = screen.getByText('Switzerland').closest('button')!;
        expect(switzerlandNode.className).toContain('ring-2');
      });
    });

    it('should navigate up with ArrowUp key', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const container = screen.getByText('Switzerland').closest('div[tabindex="-1"]')!;
      container.focus();

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');

      await waitFor(() => {
        const switzerlandNode = screen.getByText('Switzerland').closest('button')!;
        expect(switzerlandNode.className).toContain('ring-2');
      });
    });

    it('should expand node with l key', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      // Focus a button inside the container - the event listener checks document.activeElement
      const switzerlandButton = screen.getByText('Switzerland').closest('button')!;
      switzerlandButton.focus();

      // First j to set focusedNodeId to first node, then l to expand
      await user.keyboard('j');
      await user.keyboard('l');

      await waitFor(() => {
        expect(screen.getByText('Restaurant')).toBeInTheDocument();
      });
    });

    it('should expand node with ArrowRight key', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const switzerlandButton = screen.getByText('Switzerland').closest('button')!;
      switzerlandButton.focus();

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowRight}');

      await waitFor(() => {
        expect(screen.getByText('Restaurant')).toBeInTheDocument();
      });
    });

    it('should collapse node with h key', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const switzerlandButton = screen.getByText('Switzerland').closest('button')!;
      switzerlandButton.focus();

      // First navigate, expand, then collapse
      await user.keyboard('j');
      await user.keyboard('l');
      await waitFor(() => {
        expect(screen.getByText('Restaurant')).toBeInTheDocument();
      });

      await user.keyboard('h');
      await waitFor(() => {
        expect(screen.queryByText('Restaurant')).not.toBeInTheDocument();
      });
    });

    it('should collapse node with ArrowLeft key', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const switzerlandButton = screen.getByText('Switzerland').closest('button')!;
      switzerlandButton.focus();

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowRight}');
      await waitFor(() => {
        expect(screen.getByText('Restaurant')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowLeft}');
      await waitFor(() => {
        expect(screen.queryByText('Restaurant')).not.toBeInTheDocument();
      });
    });

    it('should select venue with Enter key on venue node', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const switzerlandButton = screen.getByText('Switzerland').closest('button')!;
      switzerlandButton.focus();

      // Navigate to venue: expand country, expand type, expand chain
      await user.keyboard('j'); // Focus Switzerland
      await user.keyboard('l'); // Expand Switzerland
      await user.keyboard('j'); // Move to Restaurant
      await user.keyboard('l'); // Expand Restaurant
      await user.keyboard('j'); // Move to Tibits chain
      await user.keyboard('l'); // Expand Tibits
      await user.keyboard('j'); // Move to Tibits Zurich venue
      await user.keyboard('{Enter}'); // Select venue

      await waitFor(() => {
        expect(mockOnSelectVenue).toHaveBeenCalledWith('venue-1');
      });
    });

    it('should toggle expand/collapse with Enter key on non-venue nodes', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const switzerlandButton = screen.getByText('Switzerland').closest('button')!;
      switzerlandButton.focus();

      await user.keyboard('j'); // Focus Switzerland
      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.getByText('Restaurant')).toBeInTheDocument();
      });

      await user.keyboard('{Enter}');
      await waitFor(() => {
        expect(screen.queryByText('Restaurant')).not.toBeInTheDocument();
      });
    });

    it('should not navigate beyond first node when pressing k at top', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const container = screen.getByText('Switzerland').closest('div[tabindex="-1"]')!;
      container.focus();

      await user.keyboard('k'); // Try to go up from first node

      // Should still be at Switzerland
      const switzerlandNode = screen.getByText('Switzerland').closest('button')!;
      expect(switzerlandNode.className).toContain('ring-2');
    });

    it('should not navigate beyond last node when pressing j at bottom', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const container = screen.getByText('Switzerland').closest('div[tabindex="-1"]')!;
      container.focus();

      // Navigate to last node (Austria)
      await user.keyboard('j'); // Germany
      await user.keyboard('j'); // Austria
      await user.keyboard('j'); // Try to go beyond

      // Should still be at Austria
      const austriaNode = screen.getByText('Austria').closest('button')!;
      expect(austriaNode.className).toContain('ring-2');
    });
  });

  describe('Node Icons', () => {
    it('should display country emoji for country nodes', () => {
      render(<HierarchyTree {...defaultProps} />);
      // Switzerland emoji should be visible
      const switzerlandButton = screen.getByText('Switzerland').closest('button')!;
      expect(switzerlandButton.textContent).toContain('🇨🇭');
    });

    it('should display appropriate icons for different node types', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      // Expand to see all node types
      const switzerlandNode = screen.getByText('Switzerland').closest('button')!;
      await user.click(switzerlandNode);
      const restaurantNode = screen.getByText('Restaurant').closest('button')!;
      await user.click(restaurantNode);
      const chainNode = screen.getByText('Tibits').closest('button')!;
      await user.click(chainNode);

      await waitFor(() => {
        // Check for venue type icon (🏪)
        expect(restaurantNode.textContent).toContain('🏪');
        // Check for chain icon (🔗)
        expect(chainNode.textContent).toContain('🔗');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have focusable buttons', () => {
      render(<HierarchyTree {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('tabindex', '0');
      });
    });

    it('should have proper focus management', async () => {
      const { user } = render(<HierarchyTree {...defaultProps} />);

      const firstButton = screen.getByText('Switzerland').closest('button')!;
      firstButton.focus();

      expect(document.activeElement).toBe(firstButton);
    });
  });
});
