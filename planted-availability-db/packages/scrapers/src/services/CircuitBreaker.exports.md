# CircuitBreaker Exports

Quick reference for importing and using the CircuitBreaker.

## Main Exports

```typescript
import {
  // Core Types
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerStats,
  CircuitBreakerEvents,
  StateChangeHandler,

  // Main Class
  CircuitBreaker,

  // Factory Functions
  createCircuitBreaker,
  createPlatformCircuitBreaker,

  // Error Types
  CircuitBreakerError,
  CircuitOpenError,
  CircuitTimeoutError,

  // Pre-configured Instances
  CircuitBreakers,
  CircuitBreakerConfigs,
} from '@pad/scrapers/services/CircuitBreaker';
```

## Quick Start Examples

### Using Pre-configured Breaker

```typescript
import { CircuitBreakers, CircuitOpenError } from './CircuitBreaker';

// Get singleton instance
const breaker = CircuitBreakers.getGeminiBreaker(
  async (prompt: string) => geminiAPI.generate(prompt)
);

try {
  const result = await breaker.execute('my prompt');
} catch (error) {
  if (error instanceof CircuitOpenError) {
    // Use fallback
  }
}
```

### Creating Custom Breaker

```typescript
import { createCircuitBreaker } from './CircuitBreaker';

const breaker = createCircuitBreaker(
  async (url: string) => fetch(url),
  {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000,
    volumeThreshold: 5,
    name: 'my-api',
  }
);
```

### With Platform Integration

```typescript
import { createPlatformCircuitBreaker } from './CircuitBreaker';

const breaker = createPlatformCircuitBreaker(
  async (url: string) => scraper.scrape(url),
  'uber_eats'
);
```

## Available Pre-configured Breakers

- `CircuitBreakers.getGeminiBreaker()` - Gemini AI API
- `CircuitBreakers.getClaudeBreaker()` - Claude AI API
- `CircuitBreakers.getGoogleSearchBreaker()` - Google Search API
- `CircuitBreakers.getPlatformScraperBreaker()` - Platform scrapers

## Available Configurations

- `CircuitBreakerConfigs.gemini` - AI processing (30s timeout, 50% threshold)
- `CircuitBreakerConfigs.claude` - AI processing (30s timeout, 50% threshold)
- `CircuitBreakerConfigs.googleSearch` - Search API (10s timeout, 40% threshold)
- `CircuitBreakerConfigs.platformScraper` - Web scraping (20s timeout, 60% threshold)
