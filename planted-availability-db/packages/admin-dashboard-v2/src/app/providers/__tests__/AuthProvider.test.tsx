/**
 * AuthProvider Tests
 *
 * Tests for the authentication provider including:
 * - Auth state management
 * - Sign in/out functionality
 * - Context access
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../AuthProvider';
import * as useAuthModule from '@/shared/hooks/useAuth';

// Mock the useAuth hook
vi.mock('@/shared/hooks/useAuth');

describe('AuthProvider', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockAuthState = {
    user: mockUser,
    loading: false,
    error: null,
    isAuthenticated: true,
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    getToken: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthModule.useAuth).mockReturnValue(mockAuthState as any);
  });

  describe('Provider Rendering', () => {
    it('should render children when provided', () => {
      render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should call useAuth hook', () => {
      render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      );

      expect(useAuthModule.useAuth).toHaveBeenCalled();
    });
  });

  describe('Context Value', () => {
    const TestComponent = () => {
      const auth = useAuthContext();
      return (
        <div>
          <div data-testid="user">{auth.user?.email || 'No user'}</div>
          <div data-testid="loading">{auth.loading ? 'Loading' : 'Not loading'}</div>
          <div data-testid="error">{auth.error || 'No error'}</div>
          <div data-testid="authenticated">{auth.isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
        </div>
      );
    };

    it('should provide auth state to children', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
    });

    it('should update context when auth state changes', () => {
      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');

      // Update mock to return unauthenticated state
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        user: null,
        isAuthenticated: false,
      } as any);

      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not authenticated');
    });
  });

  describe('Authentication State', () => {
    const TestComponent = () => {
      const { user, isAuthenticated } = useAuthContext();
      return (
        <div>
          <div data-testid="status">
            {isAuthenticated ? `Logged in as ${user?.email}` : 'Not logged in'}
          </div>
        </div>
      );
    };

    it('should provide authenticated user state', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('status')).toHaveTextContent('Logged in as test@example.com');
    });

    it('should provide unauthenticated state', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        user: null,
        isAuthenticated: false,
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('status')).toHaveTextContent('Not logged in');
    });

    it('should provide loading state', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        loading: true,
      } as any);

      const TestLoadingComponent = () => {
        const { loading } = useAuthContext();
        return <div data-testid="loading">{loading ? 'Loading...' : 'Loaded'}</div>;
      };

      render(
        <AuthProvider>
          <TestLoadingComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading...');
    });

    it('should provide error state', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        error: 'Authentication failed',
      } as any);

      const TestErrorComponent = () => {
        const { error } = useAuthContext();
        return <div data-testid="error">{error || 'No error'}</div>;
      };

      render(
        <AuthProvider>
          <TestErrorComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('error')).toHaveTextContent('Authentication failed');
    });
  });

  describe('Authentication Methods', () => {
    const TestComponent = () => {
      const { signIn, signInWithGoogle, signOut } = useAuthContext();
      return (
        <div>
          <button onClick={() => signIn({ email: 'test@example.com', password: 'password' })}>
            Sign In
          </button>
          <button onClick={() => signInWithGoogle()}>Sign In With Google</button>
          <button onClick={() => signOut()}>Sign Out</button>
        </div>
      );
    };

    it('should provide signIn method', async () => {
      const mockSignIn = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        signIn: mockSignIn,
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByRole('button', { name: /^sign in$/i });
      signInButton.click();

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password',
        });
      });
    });

    it('should provide signInWithGoogle method', async () => {
      const mockSignInWithGoogle = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        signInWithGoogle: mockSignInWithGoogle,
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const googleButton = screen.getByRole('button', { name: /sign in with google/i });
      googleButton.click();

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it('should provide signOut method', async () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        signOut: mockSignOut,
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      signOutButton.click();

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('should provide getToken method', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('mock-token-123');
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        getToken: mockGetToken,
      } as any);

      const TestTokenComponent = () => {
        const { getToken } = useAuthContext();
        const handleGetToken = async () => {
          const token = await getToken();
          expect(token).toBe('mock-token-123');
        };
        return <button onClick={handleGetToken}>Get Token</button>;
      };

      render(
        <AuthProvider>
          <TestTokenComponent />
        </AuthProvider>
      );

      const tokenButton = screen.getByRole('button', { name: /get token/i });
      tokenButton.click();

      await waitFor(() => {
        expect(mockGetToken).toHaveBeenCalled();
      });
    });
  });

  describe('Context Hook Error Handling', () => {
    it('should throw error when useAuthContext is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const TestComponent = () => {
        useAuthContext();
        return <div>Test</div>;
      };

      expect(() => render(<TestComponent />)).toThrow(
        'useAuthContext must be used within an AuthProvider'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('User Data', () => {
    it('should provide complete user object', () => {
      const TestUserComponent = () => {
        const { user } = useAuthContext();
        return (
          <div>
            <div data-testid="uid">{user?.uid}</div>
            <div data-testid="email">{user?.email}</div>
            <div data-testid="display-name">{user?.displayName}</div>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestUserComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('uid')).toHaveTextContent('test-user-123');
      expect(screen.getByTestId('email')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('display-name')).toHaveTextContent('Test User');
    });

    it('should provide null user when not authenticated', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        user: null,
        isAuthenticated: false,
      } as any);

      const TestUserComponent = () => {
        const { user } = useAuthContext();
        return <div data-testid="user">{user ? 'Has user' : 'No user'}</div>;
      };

      render(
        <AuthProvider>
          <TestUserComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });
  });

  describe('Loading State Transitions', () => {
    it('should handle loading to authenticated transition', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        loading: true,
      } as any);

      const TestComponent = () => {
        const { loading, isAuthenticated } = useAuthContext();
        return (
          <div data-testid="status">
            {loading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not authenticated'}
          </div>
        );
      };

      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('status')).toHaveTextContent('Loading...');

      // Simulate auth completing
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        loading: false,
        isAuthenticated: true,
      } as any);

      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('status')).toHaveTextContent('Authenticated');
    });
  });

  describe('Error Handling', () => {
    it('should propagate authentication errors', () => {
      const authError = 'Invalid credentials';
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        error: authError,
      } as any);

      const TestErrorComponent = () => {
        const { error } = useAuthContext();
        return <div data-testid="error">{error}</div>;
      };

      render(
        <AuthProvider>
          <TestErrorComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
    });

    it('should clear error on successful sign in', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        error: 'Previous error',
      } as any);

      const TestComponent = () => {
        const { error } = useAuthContext();
        return <div data-testid="error">{error || 'No error'}</div>;
      };

      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('error')).toHaveTextContent('Previous error');

      // Simulate successful sign in
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        ...mockAuthState,
        error: null,
      } as any);

      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  describe('Multiple Consumers', () => {
    it('should provide same context value to multiple consumers', () => {
      const Consumer1 = () => {
        const { user } = useAuthContext();
        return <div data-testid="consumer1">{user?.email}</div>;
      };

      const Consumer2 = () => {
        const { user } = useAuthContext();
        return <div data-testid="consumer2">{user?.email}</div>;
      };

      render(
        <AuthProvider>
          <Consumer1 />
          <Consumer2 />
        </AuthProvider>
      );

      expect(screen.getByTestId('consumer1')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('consumer2')).toHaveTextContent('test@example.com');
    });
  });
});
