import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Mock Auth Context
interface MockAuthContextValue {
  isAuthenticated: boolean;
  user: { uid: string; email: string; displayName: string } | null;
  loading: boolean;
  error: string | null;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const defaultAuthContext: MockAuthContextValue = {
  isAuthenticated: true,
  user: {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
  },
  loading: false,
  error: null,
  signIn: vi.fn().mockResolvedValue(undefined),
  signInWithGoogle: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
  getToken: vi.fn().mockResolvedValue('mock-token'),
};

// Create mock AuthContext
import { createContext, useContext } from 'react';
export const MockAuthContext = createContext<MockAuthContextValue>(defaultAuthContext);
export const useMockAuthContext = () => useContext(MockAuthContext);

interface AllProvidersProps {
  children: ReactNode;
  authContext?: Partial<MockAuthContextValue>;
  queryClient?: QueryClient;
}

/**
 * Create a mock implementation of AuthProvider for tests
 * Use this in vi.mock() calls in individual test files
 */
export function createMockAuthProvider() {
  return {
    AuthProvider: ({ children }: { children: ReactNode }) => children,
    useAuthContext: () => useMockAuthContext(),
  };
}

// All providers wrapper for testing
function AllProviders({
  children,
  authContext = {},
  queryClient,
}: AllProvidersProps) {
  const client = queryClient ?? createTestQueryClient();
  const auth = { ...defaultAuthContext, ...authContext };

  return (
    <QueryClientProvider client={client}>
      <MockAuthContext.Provider value={auth}>
        <BrowserRouter>{children}</BrowserRouter>
      </MockAuthContext.Provider>
    </QueryClientProvider>
  );
}

// Custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: Partial<MockAuthContextValue>;
  queryClient?: QueryClient;
  route?: string;
}

// Custom render function
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { authContext, queryClient, route = '/', ...renderOptions } = options;

  // Set initial route
  window.history.pushState({}, 'Test page', route);

  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: ({ children }) => (
        <AllProviders authContext={authContext} queryClient={queryClient}>
          {children}
        </AllProviders>
      ),
      ...renderOptions,
    }),
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent };

// Override render with custom render
export { customRender as render };

// Export utilities
export { createTestQueryClient };

// Wait for element utilities
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Mock data factory helpers
export function createMockVenue(overrides = {}) {
  return {
    id: `venue-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Restaurant',
    address: '123 Test St',
    city: 'Zurich',
    country: 'CH',
    platform: 'uber_eats',
    platform_url: 'https://ubereats.com/test',
    venue_type: 'restaurant',
    status: 'discovered',
    confidence: 85,
    confidence_factors: {
      name_match: 90,
      product_match: 80,
      price_match: 85,
    },
    dishes: [],
    scraped_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockDish(overrides = {}) {
  return {
    id: `dish-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Dish',
    description: 'A delicious test dish',
    price: 12.99,
    currency: 'CHF',
    image_url: 'https://example.com/dish.jpg',
    product_type: 'planted.chicken',
    confidence: 90,
    status: 'discovered',
    ...overrides,
  };
}

export function createMockHierarchy(overrides = {}) {
  return {
    id: 'CH',
    type: 'country' as const,
    label: 'Switzerland',
    count: 5,
    children: [
      {
        id: 'CH-restaurant',
        type: 'venueType' as const,
        label: 'Restaurant',
        count: 3,
        children: [],
      },
    ],
    ...overrides,
  };
}

export function createMockUser(overrides = {}) {
  return {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    ...overrides,
  };
}
