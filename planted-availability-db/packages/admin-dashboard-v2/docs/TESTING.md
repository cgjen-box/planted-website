# Testing Guide

Comprehensive testing documentation for the Admin Dashboard v2.

## Table of Contents

- [Overview](#overview)
- [Test Infrastructure](#test-infrastructure)
- [Directory Structure](#directory-structure)
- [Running Tests](#running-tests)
- [Test Patterns](#test-patterns)
- [Mock Data Factories](#mock-data-factories)
- [Coverage Requirements](#coverage-requirements)
- [Adding New Tests](#adding-new-tests)
- [CI/CD Integration](#cicd-integration)

## Overview

The Admin Dashboard v2 uses a modern testing stack that prioritizes fast, reliable tests with excellent developer experience. Our testing philosophy emphasizes:

- **Unit tests** for individual components and hooks
- **Integration tests** for feature workflows
- **API mocking** with MSW for consistent, offline testing
- **High coverage** (95% threshold) to ensure quality
- **Fast execution** with Vitest and happy-dom

## Test Infrastructure

### Core Technologies

- **[Vitest](https://vitest.dev/)** - Fast unit test framework with native ESM support
- **[Testing Library](https://testing-library.com/)** - React component testing utilities
- **[MSW (Mock Service Worker)](https://mswjs.io/)** - API request interception and mocking
- **[happy-dom](https://github.com/capricorn86/happy-dom)** - Lightweight DOM implementation
- **[user-event](https://testing-library.com/docs/user-event/intro/)** - User interaction simulation

### Key Dependencies

```json
{
  "vitest": "^2.1.8",
  "@testing-library/react": "^16.1.0",
  "@testing-library/jest-dom": "^6.6.3",
  "@testing-library/user-event": "^14.5.2",
  "msw": "^2.6.8",
  "@vitest/coverage-v8": "^2.1.8",
  "happy-dom": "^15.11.7"
}
```

### Configuration

Tests are configured in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
      },
    },
  },
});
```

## Directory Structure

```
src/
├── test/
│   ├── setup.ts                 # Global test setup
│   ├── test-utils.tsx           # Custom render functions
│   ├── smoke.test.ts            # Infrastructure smoke tests
│   └── mocks/
│       ├── server.ts            # MSW server setup
│       ├── handlers.ts          # Handler exports
│       ├── handlers/
│       │   ├── index.ts
│       │   ├── review.ts        # Review API handlers
│       │   ├── sync.ts          # Sync API handlers
│       │   ├── scraping.ts      # Scraping API handlers
│       │   └── auth.ts          # Auth API handlers
│       └── data/
│           ├── index.ts
│           ├── venues.ts        # Mock venue data
│           ├── sync.ts          # Mock sync data
│           └── scraping.ts      # Mock scraping data
│
├── features/
│   └── [feature-name]/
│       ├── components/
│       │   ├── Component.tsx
│       │   └── Component.test.tsx
│       └── hooks/
│           ├── useHook.ts
│           └── useHook.test.ts
│
└── shared/
    └── hooks/
        ├── useSharedHook.ts
        └── useSharedHook.test.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (recommended for development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests with UI (interactive browser interface)
pnpm test:ui

# Run specific test file
pnpm test src/features/review/components/ApprovalButtons.test.tsx

# Run tests matching a pattern
pnpm test --grep "ApprovalButtons"
```

### Watch Mode

Watch mode is the recommended way to develop with tests:

```bash
pnpm test:watch
```

Features:
- Automatically re-runs tests when files change
- Only runs affected tests by default
- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `p` to filter by filename
- Press `t` to filter by test name

### Coverage Reports

After running `pnpm test:coverage`, coverage reports are generated in multiple formats:

- **Terminal output** - Immediate feedback with text summary
- **HTML report** - Open `coverage/index.html` in browser for detailed view
- **LCOV format** - Used by CI/CD systems

Coverage files are located in the `coverage/` directory (gitignored).

## Test Patterns

### Component Tests

Use the custom `render()` function from `test-utils.tsx` which provides:
- React Query client
- Router context
- Mock auth context
- User event utilities

**Example:**

```typescript
import { render, screen, waitFor } from '@/test/test-utils';
import { ApprovalButtons } from './ApprovalButtons';

describe('ApprovalButtons', () => {
  it('should render approve and reject buttons', () => {
    render(<ApprovalButtons venueId="venue-1" />);

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('should call approve mutation when approve button is clicked', async () => {
    const { user } = render(<ApprovalButtons venueId="venue-1" />);

    const approveButton = screen.getByRole('button', { name: /approve/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/approved successfully/i)).toBeInTheDocument();
    });
  });
});
```

### Hook Tests

Use `renderHook()` from Testing Library to test custom hooks:

```typescript
import { renderHook, waitFor } from '@/test/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApproveVenue } from './useApproveVenue';

describe('useApproveVenue', () => {
  it('should approve venue successfully', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => useApproveVenue(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    result.current.mutate({ venueId: 'venue-1' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

### API Tests with MSW

MSW intercepts HTTP requests at the network level. Handlers are defined in `src/test/mocks/handlers/`:

**Example handler:**

```typescript
// src/test/mocks/handlers/review.ts
import { http, HttpResponse } from 'msw';

export const reviewHandlers = [
  http.post('/adminApproveVenue', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      message: 'Venue approved successfully',
      venue: { id: body.venueId, status: 'verified' },
    });
  }),
];
```

**Testing with MSW:**

```typescript
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('API Error Handling', () => {
  it('should handle approval error gracefully', async () => {
    // Override default handler for this test
    server.use(
      http.post('/adminApproveVenue', () => {
        return HttpResponse.json(
          { success: false, error: 'Server error' },
          { status: 500 }
        );
      })
    );

    const { user } = render(<ApprovalButtons venueId="venue-1" />);

    const approveButton = screen.getByRole('button', { name: /approve/i });
    await user.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### User Interactions

Use `userEvent` for realistic user interactions:

```typescript
import { render, screen } from '@/test/test-utils';

it('should submit form on enter key', async () => {
  const { user } = render(<SearchForm />);

  const input = screen.getByRole('textbox');

  // Type in the input
  await user.type(input, 'test query');

  // Press enter
  await user.keyboard('{Enter}');

  // Verify submission
  expect(mockSubmit).toHaveBeenCalledWith('test query');
});
```

### Async Testing

Always use `waitFor()` for async assertions:

```typescript
import { render, screen, waitFor } from '@/test/test-utils';

it('should load and display data', async () => {
  render(<VenueList />);

  // Show loading state
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('Tibits Zurich')).toBeInTheDocument();
  });

  // Verify loading state is gone
  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
});
```

## Mock Data Factories

Mock data factories provide consistent test data. Located in `src/test/mocks/data/` and `src/test/test-utils.tsx`.

### Built-in Factories

```typescript
import {
  createMockVenue,
  createMockDish,
  createMockHierarchy,
  createMockUser,
} from '@/test/test-utils';

// Create mock venue with defaults
const venue = createMockVenue();

// Override specific fields
const highConfidenceVenue = createMockVenue({
  confidence: 95,
  status: 'verified',
  name: 'Custom Restaurant',
});

// Create mock dish
const dish = createMockDish({
  product_type: 'planted.kebab',
  price: 15.99,
});
```

### Pre-defined Mock Data

```typescript
import { mockVenues, mockHierarchy, mockStats } from '@/test/mocks/data/venues';

describe('VenueList', () => {
  it('should display all venues', () => {
    render(<VenueList venues={mockVenues} />);

    expect(screen.getByText('Tibits Zurich')).toBeInTheDocument();
    expect(screen.getByText('Hiltl')).toBeInTheDocument();
  });
});
```

### Creating Custom Factories

Add new factories to `src/test/test-utils.tsx`:

```typescript
export function createMockSyncJob(overrides = {}) {
  return {
    id: `job-${Math.random().toString(36).substr(2, 9)}`,
    status: 'running',
    progress: 0,
    total: 100,
    started_at: new Date().toISOString(),
    ...overrides,
  };
}
```

## Coverage Requirements

### Thresholds

We maintain strict coverage thresholds to ensure code quality:

- **Lines**: 95%
- **Branches**: 90%
- **Functions**: 95%
- **Statements**: 95%

### Excluded Files

The following files are excluded from coverage:

- `node_modules/**`
- `src/test/**` - Test utilities and mocks
- `**/*.d.ts` - Type definitions
- `**/types.ts` - Type-only files
- `**/index.ts` - Re-export files
- `src/main.tsx` - Application entry point
- `src/vite-env.d.ts` - Vite type definitions

### Viewing Coverage

```bash
# Generate coverage report
pnpm test:coverage

# Open HTML report
open coverage/index.html  # macOS
start coverage/index.html # Windows
xdg-open coverage/index.html # Linux
```

The HTML report shows:
- File-by-file coverage breakdown
- Line-by-line coverage visualization
- Uncovered code highlighting
- Branch coverage details

## Adding New Tests

### 1. Component Tests

**Location**: Co-locate with component file

```
src/features/review/components/
├── ApprovalButtons.tsx
└── ApprovalButtons.test.tsx
```

**Template:**

```typescript
import { render, screen, waitFor } from '@/test/test-utils';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByRole('....')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const { user } = render(<ComponentName />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });

  it('should handle error state', () => {
    // Test error handling
  });
});
```

### 2. Hook Tests

**Location**: Co-locate with hook file

```
src/features/review/hooks/
├── useApproveVenue.ts
└── useApproveVenue.test.ts
```

**Template:**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHookName } from './useHookName';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useHookName', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useHookName(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useHookName(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### 3. API Handler Tests

**Location**: Add handlers to appropriate file in `src/test/mocks/handlers/`

```typescript
// src/test/mocks/handlers/feature.ts
import { http, HttpResponse } from 'msw';

const API_BASE = 'https://us-central1-get-planted-db.cloudfunctions.net';

export const featureHandlers = [
  http.get(`${API_BASE}/endpoint`, () => {
    return HttpResponse.json({
      success: true,
      data: { /* mock data */ },
    });
  }),

  http.post(`${API_BASE}/endpoint`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      result: body,
    });
  }),
];
```

Then add to `src/test/mocks/handlers/index.ts`:

```typescript
import { featureHandlers } from './feature';

export const handlers = [
  ...reviewHandlers,
  ...syncHandlers,
  ...featureHandlers, // Add new handlers
];
```

### 4. Test Naming Conventions

- **File names**: `ComponentName.test.tsx` or `hookName.test.ts`
- **Describe blocks**: Use component/hook name
- **Test cases**: Start with "should" and describe expected behavior

```typescript
describe('ApprovalButtons', () => {
  it('should render approve and reject buttons', () => {});
  it('should disable buttons when loading', () => {});
  it('should call onApprove when approve button is clicked', () => {});
});
```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Pull request creation
- Push to main branch
- Manual workflow dispatch

**Example workflow** (`.github/workflows/test.yml`):

```yaml
name: Test

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests with coverage
        run: pnpm test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

### Coverage Reports in CI

Coverage data is uploaded to external services:
- **Codecov** - Coverage tracking and PR comments
- **Coveralls** - Alternative coverage service
- Built-in GitHub Actions reporting

### Pre-commit Hooks

Consider adding test checks to pre-commit hooks:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "pnpm test --run",
      "pre-push": "pnpm test:coverage"
    }
  }
}
```

### PR Requirements

Pull requests must:
1. Pass all tests
2. Maintain coverage thresholds (95%)
3. Have no failing tests
4. Include tests for new features

---

## Best Practices

1. **Write tests first** - TDD helps clarify requirements
2. **Test behavior, not implementation** - Focus on what users see
3. **Keep tests simple** - One assertion per test when possible
4. **Use descriptive names** - Test names should explain the scenario
5. **Avoid test interdependence** - Each test should run independently
6. **Mock external dependencies** - Use MSW for API calls
7. **Test edge cases** - Empty states, errors, loading states
8. **Maintain fast tests** - Tests should run in milliseconds
9. **Use factories** - Consistent mock data across tests
10. **Update tests with code changes** - Keep tests in sync

## Troubleshooting

### Tests Timeout

If tests timeout (10s default):

```typescript
// Increase timeout for specific test
it('slow operation', async () => {
  // Test code
}, { timeout: 20000 }); // 20 seconds
```

### MSW Not Intercepting

Verify:
1. Server is started in `setup.ts`
2. Handler URL matches exactly
3. Handler is exported in `handlers/index.ts`

### Coverage Not Meeting Threshold

```bash
# Run coverage and see what's missing
pnpm test:coverage

# Open HTML report
open coverage/index.html
```

Focus on:
- Untested components
- Uncovered branches (if/else)
- Error handling paths

### React Query Not Working in Tests

Ensure:
1. QueryClient is provided in test wrapper
2. Retry is disabled in test client
3. Using `waitFor()` for async operations

---

For more information, see:
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [MSW Documentation](https://mswjs.io/)
