# Circuit Breaker Pattern Implementation

A robust circuit breaker implementation for preventing cascade failures when external services are down or degraded.

## Overview

The Circuit Breaker pattern is a fault tolerance mechanism that prevents an application from repeatedly trying to execute an operation that's likely to fail. It wraps external calls and monitors for failures, "opening" the circuit when failure thresholds are exceeded.

### States

- **CLOSED** (Normal): Requests pass through normally. Failures are tracked.
- **OPEN** (Failing): Requests are immediately rejected without attempting the operation. After a timeout, transitions to HALF_OPEN.
- **HALF_OPEN** (Testing): One request is allowed through to test if the service has recovered. Success closes the circuit; failure opens it again.

```
┌─────────┐
│ CLOSED  │ ──[threshold exceeded]──> ┌──────┐
│(Normal) │                            │ OPEN │
└─────────┘ <──[success]────────────── └──────┘
     ^              │                       │
     │              │ [timeout]             │
     │              ▼                       │
     │         ┌──────────┐                │
     └─────────│ HALF_OPEN│<───────────────┘
               │ (Testing)│
               └──────────┘
```

## Installation

The CircuitBreaker is already available in the scrapers package:

```typescript
import {
  CircuitBreaker,
  createCircuitBreaker,
  CircuitBreakers,
  CircuitBreakerConfigs,
  CircuitOpenError,
} from '@pad/scrapers/services/CircuitBreaker';
```

## Basic Usage

### Simple Circuit Breaker

```typescript
import { createCircuitBreaker } from './CircuitBreaker';

// Wrap any async function
const breaker = createCircuitBreaker(
  async (url: string) => {
    return await fetch(url);
  },
  {
    timeout: 30000,               // 30s timeout
    errorThresholdPercentage: 50, // Trip at 50% failures
    resetTimeout: 60000,          // Try again after 1 min
    volumeThreshold: 5,           // Min requests before tripping
    name: 'my-api',
  }
);

// Execute with protection
try {
  const result = await breaker.execute('https://api.example.com/data');
  console.log('Success:', result);
} catch (error) {
  if (error instanceof CircuitOpenError) {
    console.log('Circuit is open - service unavailable');
    // Use fallback or cache
  } else {
    console.error('Request failed:', error);
  }
}
```

### With Event Handlers

```typescript
const breaker = createCircuitBreaker(
  callExternalAPI,
  {
    timeout: 30000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000,
    volumeThreshold: 5,
    name: 'external-api',
  },
  {
    onOpen: (from, to, stats) => {
      console.warn(`Circuit OPEN! Failure rate: ${stats.failureRate}%`);
      // Switch to fallback provider
    },
    onClose: (from, to, stats) => {
      console.info('Circuit CLOSED - service recovered');
    },
    onHalfOpen: (from, to, stats) => {
      console.info('Circuit HALF_OPEN - testing recovery');
    },
    onFailure: (error, stats) => {
      console.error(`Request failed (${stats.consecutiveFailures} consecutive)`);
    },
  }
);
```

## Pre-configured Instances

### For AI Services (Gemini, Claude)

```typescript
import { CircuitBreakers } from './CircuitBreaker';

// Get pre-configured Gemini breaker (singleton)
const geminiBreaker = CircuitBreakers.getGeminiBreaker(
  async (prompt: string) => {
    return await geminiClient.generateContent(prompt);
  },
  {
    onOpen: () => {
      console.warn('Gemini down - switching to Claude');
      // Implement fallback logic
    },
  }
);

const result = await geminiBreaker.execute('my prompt');
```

**Configuration:**
- Timeout: 30s (AI processing can be slow)
- Error threshold: 50%
- Reset timeout: 60s
- Volume threshold: 5 requests

### For Google Search API

```typescript
const searchBreaker = CircuitBreakers.getGoogleSearchBreaker(
  async (query: string) => {
    return await searchEngine.search(query);
  },
  {
    onOpen: () => {
      console.warn('Search API down - rotating to next engine');
    },
  }
);
```

**Configuration:**
- Timeout: 10s (searches should be fast)
- Error threshold: 40% (stricter)
- Reset timeout: 120s (might be rate limited)
- Volume threshold: 3 requests

### For Platform Scrapers

```typescript
const scraperBreaker = CircuitBreakers.getPlatformScraperBreaker(
  async (url: string) => {
    return await scraper.scrape(url);
  },
  'uber_eats', // platform name
  {
    onOpen: () => {
      console.warn('Platform unavailable or blocking');
    },
  }
);
```

**Configuration:**
- Timeout: 20s
- Error threshold: 60%
- Reset timeout: 300s (5 min - platform might have changed)
- Volume threshold: 5 requests

## Integration with PlatformHealthMonitor

Combine circuit breakers with the existing PlatformHealthMonitor:

```typescript
import { createPlatformCircuitBreaker } from './CircuitBreaker';
import { recordPlatformEvent } from './PlatformHealthMonitor';

const breaker = createPlatformCircuitBreaker(
  async (url: string) => {
    const startTime = Date.now();
    try {
      const result = await scraper.scrape(url);
      const responseTime = Date.now() - startTime;

      await recordPlatformEvent({
        platform: 'uber_eats',
        success: true,
        response_time_ms: responseTime,
        url,
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      await recordPlatformEvent({
        platform: 'uber_eats',
        success: false,
        response_time_ms: responseTime,
        error: error.message,
        url,
      });

      throw error;
    }
  },
  'uber_eats'
);
```

## Monitoring and Stats

### Get Statistics

```typescript
const stats = breaker.getStats();
console.log({
  state: stats.state,                      // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failureRate: stats.failureRate,         // 0-100
  consecutiveFailures: stats.consecutiveFailures,
  totalRequests: stats.totalRequests,
  lastFailureTime: stats.lastFailureTime,
  nextAttemptTime: stats.nextAttemptTime, // when OPEN will try HALF_OPEN
});
```

### Monitor All Circuit Breakers

```typescript
const allStats = CircuitBreakers.getAllStats();

for (const [name, stats] of allStats.entries()) {
  console.log(`${name}: ${stats.state} (${stats.failureRate}% failure rate)`);

  if (stats.state === 'OPEN') {
    // Alert operations team
    await sendAlert({
      severity: 'high',
      title: `Circuit breaker OPEN: ${name}`,
      message: `Service unavailable. Next attempt: ${stats.nextAttemptTime}`,
    });
  }
}
```

## Manual Control

### Force States

```typescript
// Manually open during maintenance
breaker.forceOpen();

// Manually close after verification
breaker.forceClose();

// Reset all statistics
breaker.reset();
```

### Check State

```typescript
const state = breaker.getState();

if (state === 'OPEN') {
  // Use cached data or fallback
} else {
  // Proceed with request
}
```

## Advanced Patterns

### Fallback Chain

```typescript
class ResilientAIClient {
  private geminiBreaker: CircuitBreaker<any>;
  private claudeBreaker: CircuitBreaker<any>;

  async generate(prompt: string): Promise<string> {
    // Try Gemini first
    if (this.geminiBreaker.getState() !== 'OPEN') {
      try {
        return await this.geminiBreaker.execute(prompt);
      } catch (error) {
        if (!(error instanceof CircuitOpenError)) {
          throw error;
        }
      }
    }

    // Fallback to Claude
    if (this.claudeBreaker.getState() !== 'OPEN') {
      console.log('Using Claude as fallback');
      return await this.claudeBreaker.execute(prompt);
    }

    throw new Error('All AI services unavailable');
  }
}
```

### Graceful Degradation

```typescript
async function getVenueData(id: string) {
  try {
    return await breaker.execute(id);
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      // Return cached data with warning
      const cached = await cache.get(id);
      return {
        ...cached,
        stale: true,
        message: 'Using cached data - service temporarily unavailable',
      };
    }
    throw error;
  }
}
```

### Health Check Dashboard

```typescript
export function getCircuitBreakerHealth() {
  const stats = CircuitBreakers.getAllStats();

  return {
    healthy: Array.from(stats.values()).filter((s) => s.state === 'CLOSED').length,
    degraded: Array.from(stats.values()).filter((s) => s.state === 'HALF_OPEN').length,
    down: Array.from(stats.values()).filter((s) => s.state === 'OPEN').length,
    details: Object.fromEntries(stats),
  };
}
```

## Configuration Guidelines

### Timeout Selection

- **Fast APIs** (Search, simple REST): 5-10s
- **Moderate APIs** (Web scraping, database): 10-20s
- **Slow APIs** (AI processing, heavy computation): 20-30s

### Error Threshold

- **Critical services**: 30-40% (fail fast)
- **Normal services**: 50-60% (balanced)
- **Flaky services**: 70-80% (tolerant)

### Reset Timeout

- **Transient errors** (network): 30-60s
- **Rate limiting**: 2-5 min
- **Service updates** (platform changes): 5-15 min

### Volume Threshold

- **High traffic**: 10-20 requests
- **Normal traffic**: 5-10 requests
- **Low traffic**: 3-5 requests

## Best Practices

1. **Always handle CircuitOpenError** - Have a fallback strategy (cache, alternative service, error message)

2. **Monitor circuit states** - Set up alerts for OPEN circuits

3. **Use appropriate configurations** - Different services need different thresholds

4. **Combine with retry logic** - Circuit breakers prevent retries when a service is down, but individual requests can still be retried

5. **Test failure scenarios** - Verify your fallback logic works when circuits open

6. **Log state transitions** - Track when and why circuits open/close

7. **Use singleton breakers** - Share circuit breaker instances across your application

## Integration Checklist

- [ ] Wrap all external API calls with circuit breakers
- [ ] Configure appropriate thresholds for each service
- [ ] Implement fallback strategies for critical services
- [ ] Set up monitoring and alerting for OPEN circuits
- [ ] Test failure scenarios and recovery
- [ ] Document fallback behaviors for operations team

## See Also

- `CircuitBreaker.example.ts` - Comprehensive usage examples
- `PlatformHealthMonitor.ts` - Service health tracking
- FUTURE-IMPROVEMENTS.md Section 6.1 - Resilience improvements
