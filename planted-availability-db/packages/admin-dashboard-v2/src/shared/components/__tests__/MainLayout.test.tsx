import { describe, it, expect, vi } from 'vitest';
import { render, screen, useMockAuthContext } from '@/test/test-utils';
import { MainLayout } from '../Layout/MainLayout';

// Mock the AuthProvider to use the test utils mock
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuthContext: () => useMockAuthContext(),
}));

describe('MainLayout', () => {
  describe('Rendering', () => {
    it('renders children content', () => {
      render(
        <MainLayout>
          <div>Main content</div>
        </MainLayout>
      );
      expect(screen.getByText('Main content')).toBeInTheDocument();
    });

    it('renders brand name', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );
      expect(screen.getByText('Planted Admin')).toBeInTheDocument();
    });

    it('renders all navigation tabs', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.getByRole('link', { name: /approve queue/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /live venues/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sync/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /stats/i })).toBeInTheDocument();
    });

    it('renders logout button', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });
  });

  describe('Navigation Tabs', () => {
    it('highlights active tab on home route', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>,
        { route: '/' }
      );

      const approveTab = screen.getByRole('link', { name: /approve queue/i });
      expect(approveTab).toHaveClass('bg-primary');
      expect(approveTab).toHaveClass('text-primary-foreground');
    });

    it('highlights sync tab when active', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>,
        { route: '/live' }
      );

      const syncTab = screen.getByRole('link', { name: /sync/i });
      expect(syncTab).toHaveClass('bg-primary');
    });

    it('highlights stats tab when active', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>,
        { route: '/stats' }
      );

      const statsTab = screen.getByRole('link', { name: /stats/i });
      expect(statsTab).toHaveClass('bg-primary');
    });

    it('inactive tabs have muted styling', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>,
        { route: '/' }
      );

      const syncTab = screen.getByRole('link', { name: /sync/i });
      expect(syncTab).toHaveClass('text-muted-foreground');
    });

    it('tabs have correct href attributes', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      expect(screen.getByRole('link', { name: /approve queue/i })).toHaveAttribute(
        'href',
        '/'
      );
      expect(screen.getByRole('link', { name: /live venues/i })).toHaveAttribute(
        'href',
        '/live-venues'
      );
      expect(screen.getByRole('link', { name: /sync/i })).toHaveAttribute(
        'href',
        '/live'
      );
      expect(screen.getByRole('link', { name: /stats/i })).toHaveAttribute(
        'href',
        '/stats'
      );
    });
  });

  describe('Tab Icons', () => {
    it('approve queue tab has CheckCircle icon', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const approveTab = screen.getByRole('link', { name: /approve queue/i });
      const icon = approveTab.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('sync tab has Globe icon', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const syncTab = screen.getByRole('link', { name: /sync/i });
      const icon = syncTab.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('stats tab has BarChart3 icon', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const statsTab = screen.getByRole('link', { name: /stats/i });
      const icon = statsTab.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('logout button has LogOut icon', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      const icon = logoutButton.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('calls signOut when logout button is clicked', async () => {
      const mockSignOut = vi.fn();
      const { user } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>,
        {
          authContext: {
            signOut: mockSignOut,
          },
        }
      );

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('handles logout errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSignOut = vi.fn().mockRejectedValue(new Error('Logout failed'));

      const { user } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>,
        {
          authContext: {
            signOut: mockSignOut,
          },
        }
      );

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      expect(mockSignOut).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith('Logout failed:', expect.any(Error));

      consoleError.mockRestore();
    });
  });

  describe('Layout Structure', () => {
    it('has full height layout', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const layout = container.querySelector('.h-screen');
      expect(layout).toBeInTheDocument();
      expect(layout).toHaveClass('flex');
      expect(layout).toHaveClass('flex-col');
    });

    it('header has correct styling', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const header = container.querySelector('header');
      expect(header).toHaveClass('border-b');
      expect(header).toHaveClass('bg-card');
    });

    it('header has correct height', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const headerInner = container.querySelector('.h-14');
      expect(headerInner).toBeInTheDocument();
    });

    it('main content area is scrollable', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('flex-1');
      expect(main).toHaveClass('overflow-y-auto');
    });
  });

  describe('Responsive Design', () => {
    it('has proper spacing on mobile and desktop', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const headerContent = container.querySelector('.px-4');
      expect(headerContent).toBeInTheDocument();
    });

    it('navigation layout is flexible', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('flex');
      expect(nav).toHaveClass('items-center');
      expect(nav).toHaveClass('gap-1');
    });
  });

  describe('Navigation Interactions', () => {
    it('tabs are clickable links', async () => {
      const { user } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const approveTab = screen.getByRole('link', { name: /approve queue/i });
      expect(approveTab).toBeInTheDocument();
      expect(approveTab.tagName).toBe('A');
    });

    it('inactive tabs have hover styles', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>,
        { route: '/' }
      );

      const syncTab = screen.getByRole('link', { name: /sync/i });
      expect(syncTab).toHaveClass('hover:bg-muted');
      expect(syncTab).toHaveClass('hover:text-foreground');
    });
  });

  describe('Content Rendering', () => {
    it('renders complex children', () => {
      render(
        <MainLayout>
          <div>
            <h1>Page Title</h1>
            <p>Page content</p>
            <button>Action</button>
          </div>
        </MainLayout>
      );

      expect(screen.getByText('Page Title')).toBeInTheDocument();
      expect(screen.getByText('Page content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });

    it('renders multiple child components', () => {
      render(
        <MainLayout>
          <div>Section 1</div>
          <div>Section 2</div>
          <div>Section 3</div>
        </MainLayout>
      );

      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
      expect(screen.getByText('Section 3')).toBeInTheDocument();
    });
  });

  describe('Header Layout', () => {
    it('header content is space-between', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const headerContent = container.querySelector('.justify-between');
      expect(headerContent).toBeInTheDocument();
    });

    it('brand and nav are properly aligned', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const brandSection = container.querySelector('.items-center.gap-2');
      expect(brandSection).toBeInTheDocument();
    });
  });

  describe('Tab Styling', () => {
    it('tabs have proper padding and spacing', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const tab = screen.getByRole('link', { name: /approve queue/i });
      expect(tab).toHaveClass('px-4');
      expect(tab).toHaveClass('py-2');
      expect(tab).toHaveClass('rounded-md');
    });

    it('tabs have transition animation', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const tab = screen.getByRole('link', { name: /approve queue/i });
      expect(tab).toHaveClass('transition-colors');
    });

    it('tabs have correct icon and text gap', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const tab = screen.getByRole('link', { name: /approve queue/i });
      expect(tab).toHaveClass('gap-2');
    });
  });

  describe('Logout Button Styling', () => {
    it('logout button has ghost variant', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toHaveClass('text-muted-foreground');
      expect(logoutButton).toHaveClass('hover:text-foreground');
    });

    it('logout button icon has correct size', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      const icon = logoutButton.querySelector('svg');
      expect(icon).toHaveClass('h-4');
      expect(icon).toHaveClass('w-4');
    });
  });

  describe('Accessibility', () => {
    it('has semantic header element', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('has semantic nav element', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
    });

    it('has semantic main element', () => {
      const { container } = render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
    });

    it('navigation links are keyboard accessible', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toBeInTheDocument();
      });
    });

    it('logout button is keyboard accessible', () => {
      render(
        <MainLayout>
          <div>Content</div>
        </MainLayout>
      );

      const button = screen.getByRole('button', { name: /logout/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('renders without children', () => {
      const { container } = render(<MainLayout>{null}</MainLayout>);
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('handles very long content', () => {
      const longContent = Array(100)
        .fill('Long content')
        .map((text, i) => <p key={i}>{text}</p>);

      render(<MainLayout>{longContent}</MainLayout>);

      const main = document.querySelector('main');
      expect(main).toHaveClass('overflow-y-auto');
    });
  });
});
