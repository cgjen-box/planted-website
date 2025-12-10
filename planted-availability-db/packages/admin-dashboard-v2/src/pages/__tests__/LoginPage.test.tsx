/**
 * LoginPage Tests
 *
 * Tests for the authentication page including:
 * - Email/password form validation
 * - Google sign-in
 * - Error states and messages
 * - Navigation on successful login
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, createMockAuthProvider } from '@/test/test-utils';
import { LoginPage } from '../LoginPage';
import userEvent from '@testing-library/user-event';

// Mock AuthProvider
vi.mock('@/app/providers/AuthProvider', () => createMockAuthProvider());

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form with all elements', () => {
      render(<LoginPage />, { authContext: { isAuthenticated: false, loading: false } });

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Sign in to access the admin dashboard')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
    });

    it('should render email input with correct attributes', () => {
      render(<LoginPage />, { authContext: { isAuthenticated: false, loading: false } });

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'admin@example.com');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    it('should render password input with correct attributes', () => {
      render(<LoginPage />, { authContext: { isAuthenticated: false, loading: false } });

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting empty form', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { authContext: { isAuthenticated: false, loading: false } });

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter both email and password')).toBeInTheDocument();
      });
    });

    it('should show error when email is missing', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { authContext: { isAuthenticated: false, loading: false } });

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter both email and password')).toBeInTheDocument();
      });
    });

    it('should show error when password is missing', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { authContext: { isAuthenticated: false, loading: false } });

      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter both email and password')).toBeInTheDocument();
      });
    });
  });

  describe('Email/Password Sign In', () => {
    it('should call signIn with credentials on form submit', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.fn().mockResolvedValue(undefined);

      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: false,
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should navigate to home page on successful sign in', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.fn().mockResolvedValue(undefined);

      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: false,
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should show error message on failed sign in', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.fn().mockRejectedValue(new Error('Invalid email or password'));

      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: false,
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });
    });

    it('should disable form inputs during sign in', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: true, // Set loading to true to test disabled state
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /signing in.../i });

      // Check that inputs are disabled during loading
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('should show loading text on submit button during sign in', async () => {
      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: true, // Set loading to true to show loading text
        },
      });

      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });
  });

  describe('Google Sign In', () => {
    it('should call signInWithGoogle on button click', async () => {
      const user = userEvent.setup();
      const mockSignInWithGoogle = vi.fn().mockResolvedValue(undefined);

      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: false,
          signInWithGoogle: mockSignInWithGoogle,
        },
      });

      const googleButton = screen.getByRole('button', { name: /sign in with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
      });
    });

    it('should navigate to home page on successful Google sign in', async () => {
      const user = userEvent.setup();
      const mockSignInWithGoogle = vi.fn().mockResolvedValue(undefined);

      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: false,
          signInWithGoogle: mockSignInWithGoogle,
        },
      });

      const googleButton = screen.getByRole('button', { name: /sign in with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should show error message on failed Google sign in', async () => {
      const user = userEvent.setup();
      const mockSignInWithGoogle = vi.fn().mockRejectedValue(new Error('Google sign-in failed'));

      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: false,
          signInWithGoogle: mockSignInWithGoogle,
        },
      });

      const googleButton = screen.getByRole('button', { name: /sign in with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText('Google sign-in failed')).toBeInTheDocument();
      });
    });

    it('should disable Google sign-in button during loading', async () => {
      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: true, // Set loading to true to test disabled state
        },
      });

      const googleButton = screen.getByRole('button', { name: /sign in with google/i });
      expect(googleButton).toBeDisabled();
    });
  });

  describe('Error States', () => {
    it('should display auth context error if present', () => {
      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: false,
          error: 'Network error occurred',
        },
      });

      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });

    it('should clear previous errors when submitting new form', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi
        .fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined);

      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: false,
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in$/i });

      // First attempt - should show error
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrong');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Clear inputs
      await user.clear(emailInput);
      await user.clear(passwordInput);

      // Second attempt - error should be cleared
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'correct');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });

    it('should clear error when clicking Google sign-in', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.fn().mockRejectedValue(new Error('Email error'));
      const mockSignInWithGoogle = vi.fn().mockResolvedValue(undefined);

      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: false,
          signIn: mockSignIn,
          signInWithGoogle: mockSignInWithGoogle,
        },
      });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in$/i });

      // Trigger email error
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email error')).toBeInTheDocument();
      });

      // Click Google sign-in - should clear error
      const googleButton = screen.getByRole('button', { name: /sign in with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.queryByText('Email error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should disable all inputs when auth is loading', () => {
      render(<LoginPage />, {
        authContext: {
          isAuthenticated: false,
          loading: true,
        },
      });

      expect(screen.getByLabelText('Email')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<LoginPage />, { authContext: { isAuthenticated: false, loading: false } });

      const form = screen.getByRole('button', { name: /sign in$/i }).closest('form');
      expect(form).toBeInTheDocument();
    });

    it('should have associated labels for inputs', () => {
      render(<LoginPage />, { authContext: { isAuthenticated: false, loading: false } });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('should show error icon with error messages', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, { authContext: { isAuthenticated: false, loading: false } });

      const submitButton = screen.getByRole('button', { name: /sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorContainer = screen.getByText('Please enter both email and password').closest('div');
        expect(errorContainer).toBeInTheDocument();
      });
    });
  });
});
