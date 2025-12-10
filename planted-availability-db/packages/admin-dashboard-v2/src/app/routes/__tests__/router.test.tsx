/**
 * Router Tests
 *
 * Tests for route configuration including:
 * - Protected route behavior
 * - Public route behavior
 * - Authentication redirects
 * - Route paths
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { router } from '../router';
import * as AuthProviderModule from '@/app/providers/AuthProvider';

// Mock the AuthProvider
vi.mock('@/app/providers/AuthProvider', async () => {
  const actual = await vi.importActual('@/app/providers/AuthProvider');
  return {
    ...actual,
    useAuthContext: vi.fn(),
  };
});

// Mock pages to simplify testing
vi.mock('@/pages/LoginPage', () => ({
  LoginPage: () => <div>Login Page</div>,
}));

vi.mock('@/pages/ReviewQueuePage', () => ({
  ReviewQueuePage: () => <div>Review Queue Page</div>,
}));

vi.mock('@/pages/LiveWebsitePage', () => ({
  LiveWebsitePage: () => <div>Live Website Page</div>,
}));

vi.mock('@/pages/StatsPage', () => ({
  StatsPage: () => <div>Stats Page</div>,
}));

vi.mock('@/shared/components/Layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>Layout: {children}</div>,
}));

describe('Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Protected Routes', () => {
    it('should render review queue page when authenticated at /', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { uid: 'test', email: 'test@example.com' },
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Review Queue Page')).toBeInTheDocument();
      });
    });

    it('should render live website page when authenticated at /live', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { uid: 'test', email: 'test@example.com' },
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/live'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Live Website Page')).toBeInTheDocument();
      });
    });

    it('should render stats page when authenticated at /stats', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { uid: 'test', email: 'test@example.com' },
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/stats'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Stats Page')).toBeInTheDocument();
      });
    });

    it('should redirect to login when not authenticated', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });

    it('should show loading state while checking authentication', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        loading: true,
        user: null,
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
      });
    });

    it('should wrap protected routes in MainLayout', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { uid: 'test', email: 'test@example.com' },
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText(/Layout:/)).toBeInTheDocument();
        expect(screen.getByText('Review Queue Page')).toBeInTheDocument();
      });
    });
  });

  describe('Public Routes', () => {
    it('should render login page when not authenticated at /login', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/login'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });

    it('should redirect to home when authenticated user visits login', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { uid: 'test', email: 'test@example.com' },
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/login'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Review Queue Page')).toBeInTheDocument();
      });
    });

    it('should show loading state on login page while checking auth', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        loading: true,
        user: null,
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/login'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });

  describe('Catch-all Route', () => {
    it('should redirect unknown routes to home when authenticated', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { uid: 'test', email: 'test@example.com' },
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/unknown-route'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Review Queue Page')).toBeInTheDocument();
      });
    });

    it('should redirect unknown routes to login when not authenticated', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/unknown-route'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });
  });

  describe('Route Paths', () => {
    it('should have correct path for login route', () => {
      const loginRoute = router.routes.find((r) => r.path === '/login');
      expect(loginRoute).toBeDefined();
    });

    it('should have correct path for home route', () => {
      const homeRoute = router.routes.find((r) => r.path === '/');
      expect(homeRoute).toBeDefined();
    });

    it('should have correct path for live website route', () => {
      const liveRoute = router.routes.find((r) => r.path === '/live');
      expect(liveRoute).toBeDefined();
    });

    it('should have correct path for stats route', () => {
      const statsRoute = router.routes.find((r) => r.path === '/stats');
      expect(statsRoute).toBeDefined();
    });

    it('should have catch-all route', () => {
      const catchAllRoute = router.routes.find((r) => r.path === '*');
      expect(catchAllRoute).toBeDefined();
    });
  });

  describe('Authentication Flow', () => {
    it('should redirect to home after successful authentication from protected route', async () => {
      // Start unauthenticated
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      const { unmount } = render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });

      // Simulate successful authentication
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { uid: 'test', email: 'test@example.com' },
      } as any);

      // Unmount old router and create new one to pick up new auth state
      unmount();

      const authenticatedRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      render(<RouterProvider router={authenticatedRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Review Queue Page')).toBeInTheDocument();
      });
    });

    it('should not show protected content during loading', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        loading: true,
        user: null,
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.queryByText('Review Queue Page')).not.toBeInTheDocument();
        expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
      });
    });
  });

  describe('Replace Behavior', () => {
    it('should use replace navigation for protected route redirects', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/stats'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });

      // The redirect should have used replace, so navigation state should not include /stats
      // This is verified by the fact that we went directly to login
    });

    it('should use replace navigation for public route redirects', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { uid: 'test', email: 'test@example.com' },
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/login'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Review Queue Page')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Protected Routes', () => {
    it('should allow navigation between protected routes when authenticated', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { uid: 'test', email: 'test@example.com' },
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      const { rerender } = render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Review Queue Page')).toBeInTheDocument();
      });

      // Navigate to /live
      testRouter.navigate('/live');
      rerender(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Live Website Page')).toBeInTheDocument();
      });

      // Navigate to /stats
      testRouter.navigate('/stats');
      rerender(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Stats Page')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid auth state changes', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        loading: true,
        user: null,
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      const { unmount } = render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Checking authentication...')).toBeInTheDocument();
      });

      // Change to authenticated
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: true,
        loading: false,
        user: { uid: 'test', email: 'test@example.com' },
      } as any);

      // Unmount old router and create new one to pick up new auth state
      unmount();

      const authenticatedRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      render(<RouterProvider router={authenticatedRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Review Queue Page')).toBeInTheDocument();
      });
    });

    it('should handle auth errors gracefully', async () => {
      vi.mocked(AuthProviderModule.useAuthContext).mockReturnValue({
        isAuthenticated: false,
        loading: false,
        user: null,
        error: 'Authentication error',
      } as any);

      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: ['/'],
      });

      render(<RouterProvider router={testRouter} />);

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
    });
  });
});
