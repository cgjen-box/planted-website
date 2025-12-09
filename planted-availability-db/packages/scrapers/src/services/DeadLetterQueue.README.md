# Dead Letter Queue (DLQ) Service

A robust error handling system for failed operations in the planted-availability-db scrapers package. Implements automatic retry scheduling with exponential backoff and escalation to manual review.

## Overview

The Dead Letter Queue service provides:

- **Automatic Retry Scheduling**: Failed operations are automatically retried with exponential backoff
- **Firestore Persistence**: All failed operations are stored in Firestore for durability
- **Manual Intervention**: Operations can be escalated for manual review after max retries
- **Query & Filter**: Rich query capabilities to find and analyze failed operations
- **Statistics**: Track failure patterns by type, platform, and status
- **Cleanup**: Automatic cleanup of old resolved operations

## Features

### 1. Exponential Backoff Retry Schedule

Operations are retried with increasing delays:

| Attempt | Delay      | Time from First Attempt |
|---------|------------|------------------------|
| 1       | Immediate  | 0 min                  |
| 2       | 5 minutes  | 5 min                  |
| 3       | 30 minutes | 35 min                 |
| 4       | 2 hours    | 2h 35min               |
| 5       | 6 hours    | 8h 35min               |
| 6+      | Manual     | Requires manual review |

After 5 attempts, operations are automatically marked as `requires_manual`.

### 2. Operation Types

The DLQ supports four operation types:

- **`discovery`**: Web search and venue discovery operations
- **`dish_extraction`**: Menu scraping and dish extraction
- **`venue_verification`**: Venue validation and verification
- **`menu_scrape`**: General menu scraping operations

### 3. Status States

Operations transition through three states:

- **`pending_retry`**: Awaiting automatic retry (has not exceeded max_attempts)
- **`requires_manual`**: Exceeded max retries, needs human intervention
- **`resolved`**: Successfully resolved (either via retry or manual fix)

## Installation

The service is automatically available in the scrapers package:

```typescript
import {
  queueFailedOperation,
  getFailedOperations,
  getRetryableOperations,
  retryOperation,
  markResolved,
  markRequiresManual,
  getDLQStats,
  cleanupResolvedOperations,
} from './services/DeadLetterQueue.js';
```

## Quick Start

### 1. Queue a Failed Operation

When an operation fails, add it to the DLQ:

```typescript
try {
  // Your operation here
  await discoverVenues(query);
} catch (error) {
  await queueFailedOperation({
    type: 'discovery',
    platform: 'uber_eats',
    error: error.message,
    stack: error.stack,
    attempts: 1,
    status: 'pending_retry',
    context: {
      query: 'planted chicken Berlin',
      country: 'DE',
    },
  });
}
```

### 2. Get Operations Ready for Retry

Fetch operations that are due for retry:

```typescript
const retryable = await getRetryableOperations();

for (const op of retryable) {
  try {
    // Retry the operation based on context
    await retryBasedOnType(op);
    await markResolved(op.id);
  } catch (error) {
    // Schedule next retry
    await retryOperation(op.id);
  }
}
```

### 3. Query Failed Operations

Filter operations by various criteria:

```typescript
// Get all pending dish extractions
const pending = await getFailedOperations({
  type: 'dish_extraction',
  status: 'pending_retry',
  limit: 20,
});

// Get operations requiring manual review
const manual = await getFailedOperations({
  status: 'requires_manual',
});

// Get failures for specific platform
const woltFailures = await getFailedOperations({
  platform: 'wolt',
  status: 'pending_retry',
});

// Get failures in date range
const recent = await getFailedOperations({
  after_date: new Date('2024-01-01'),
  before_date: new Date('2024-12-31'),
});
```

### 4. Get Statistics

View DLQ statistics:

```typescript
const stats = await getDLQStats();

console.log(`Total Failed: ${stats.total_failed}`);
console.log(`Pending Retry: ${stats.pending_retry}`);
console.log(`Requires Manual: ${stats.requires_manual}`);
console.log(`Resolved: ${stats.resolved}`);

// By type
console.log('By Type:', stats.by_type);
// { discovery: 45, dish_extraction: 23, venue_verification: 12, menu_scrape: 5 }

// By platform
console.log('By Platform:', stats.by_platform);
// { uber_eats: 30, wolt: 25, lieferando: 20 }
```

## API Reference

### `queueFailedOperation(operation)`

Add a failed operation to the DLQ.

**Parameters:**
- `type`: Operation type ('discovery' | 'dish_extraction' | 'venue_verification' | 'menu_scrape')
- `platform?`: Delivery platform (optional)
- `venue_id?`: Associated venue ID (optional)
- `error`: Error message
- `stack?`: Error stack trace (optional)
- `attempts`: Current attempt number
- `status`: Operation status
- `max_attempts?`: Maximum retry attempts (default: 5)
- `context?`: Additional context for retry (optional)

**Returns:** `Promise<string>` - The ID of the queued operation

**Example:**
```typescript
const opId = await queueFailedOperation({
  type: 'dish_extraction',
  venue_id: 'venue_123',
  platform: 'wolt',
  error: 'Puppeteer timeout',
  attempts: 1,
  status: 'pending_retry',
  context: {
    url: 'https://wolt.com/...',
  },
});
```

### `getFailedOperations(filters)`

Query failed operations with filters.

**Parameters:**
- `status?`: Filter by status
- `type?`: Filter by operation type
- `platform?`: Filter by platform
- `venue_id?`: Filter by venue ID
- `before_date?`: Filter by date (before)
- `after_date?`: Filter by date (after)
- `limit?`: Maximum results to return

**Returns:** `Promise<FailedOperation[]>`

**Example:**
```typescript
const failures = await getFailedOperations({
  type: 'discovery',
  status: 'requires_manual',
  platform: 'uber_eats',
  limit: 10,
});
```

### `getRetryableOperations()`

Get operations that are due for retry (next_retry_at <= now).

**Returns:** `Promise<FailedOperation[]>`

**Example:**
```typescript
const retryable = await getRetryableOperations();
```

### `retryOperation(id)`

Manually trigger a retry for a specific operation. Increments attempts and schedules next retry.

**Parameters:**
- `id`: Operation ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await retryOperation('op_abc123');
```

### `markResolved(id)`

Mark an operation as successfully resolved.

**Parameters:**
- `id`: Operation ID

**Returns:** `Promise<void>`

**Example:**
```typescript
await markResolved('op_abc123');
```

### `markRequiresManual(id, reason?)`

Escalate an operation to manual review.

**Parameters:**
- `id`: Operation ID
- `reason?`: Reason for manual escalation (optional)

**Returns:** `Promise<void>`

**Example:**
```typescript
await markRequiresManual('op_abc123', 'Platform structure changed - needs adapter update');
```

### `getDLQStats()`

Get statistics about the DLQ.

**Returns:** `Promise<DLQStats>`

**Example:**
```typescript
const stats = await getDLQStats();
```

### `cleanupResolvedOperations(olderThanDays?)`

Delete resolved operations older than specified days.

**Parameters:**
- `olderThanDays?`: Age threshold in days (default: 30)

**Returns:** `Promise<number>` - Number of operations deleted

**Example:**
```typescript
const deleted = await cleanupResolvedOperations(30);
console.log(`Cleaned up ${deleted} old operations`);
```

## Integration Patterns

### Pattern 1: Inline Error Handling

Wrap operations with try-catch and queue failures:

```typescript
async function discoverVenuesWithDLQ(query: string, platform: string) {
  try {
    return await performDiscovery(query, platform);
  } catch (error) {
    await queueFailedOperation({
      type: 'discovery',
      platform,
      error: error.message,
      stack: error.stack,
      attempts: 1,
      status: 'pending_retry',
      context: { query, platform },
    });
    throw error; // Re-throw or handle gracefully
  }
}
```

### Pattern 2: Scheduled Retry Job

Create a scheduled function to process retryable operations:

```typescript
// Run every hour
export const retryFailedOperations = onSchedule('every 1 hours', async () => {
  const retryable = await getRetryableOperations();

  console.log(`Processing ${retryable.length} retryable operations`);

  for (const op of retryable) {
    try {
      // Retry based on type
      switch (op.type) {
        case 'discovery':
          await retryDiscovery(op);
          break;
        case 'dish_extraction':
          await retryDishExtraction(op);
          break;
        // ... other types
      }

      await markResolved(op.id);
    } catch (error) {
      console.error(`Retry failed for ${op.id}: ${error.message}`);
      await retryOperation(op.id); // Schedule next attempt
    }
  }
});
```

### Pattern 3: Manual Review Dashboard

Build a dashboard to review operations requiring manual intervention:

```typescript
async function getManualReviewQueue() {
  const manual = await getFailedOperations({
    status: 'requires_manual',
  });

  // Group by error message to find patterns
  const grouped = manual.reduce((acc, op) => {
    if (!acc[op.error]) acc[op.error] = [];
    acc[op.error].push(op);
    return acc;
  }, {} as Record<string, FailedOperation[]>);

  return grouped;
}
```

### Pattern 4: Platform Health Monitoring

Detect platform-wide issues:

```typescript
async function detectPlatformIssues() {
  const failures = await getFailedOperations({
    status: 'pending_retry',
    after_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
  });

  // Count failures by platform
  const platformCounts: Record<string, number> = {};
  failures.forEach((op) => {
    if (op.platform) {
      platformCounts[op.platform] = (platformCounts[op.platform] || 0) + 1;
    }
  });

  // Alert if any platform has >10 failures in 24h
  for (const [platform, count] of Object.entries(platformCounts)) {
    if (count > 10) {
      console.warn(`Platform ${platform} has ${count} failures in last 24h - possible outage or structure change`);
    }
  }
}
```

## Firestore Schema

Operations are stored in the `failed_operations` collection:

```typescript
{
  type: 'discovery' | 'dish_extraction' | 'venue_verification' | 'menu_scrape',
  venue_id: string | null,
  platform: string | null,
  error: string,
  stack: string | null,
  attempts: number,
  max_attempts: number,
  created_at: Timestamp,
  last_attempt_at: Timestamp,
  next_retry_at: Timestamp | null,
  status: 'pending_retry' | 'requires_manual' | 'resolved',
  context: object | null,
  manual_review_reason?: string // Added when escalated to manual
}
```

### Indexes

Recommended Firestore indexes for optimal query performance:

1. **Status + Next Retry**:
   - `status` (Ascending)
   - `next_retry_at` (Ascending)
   - `attempts` (Ascending)

2. **Type + Status**:
   - `type` (Ascending)
   - `status` (Ascending)
   - `created_at` (Descending)

3. **Platform + Status**:
   - `platform` (Ascending)
   - `status` (Ascending)
   - `created_at` (Descending)

## Best Practices

### 1. Include Rich Context

Always include enough context to retry the operation:

```typescript
await queueFailedOperation({
  type: 'dish_extraction',
  venue_id: venue.id,
  platform: 'wolt',
  error: error.message,
  attempts: 1,
  status: 'pending_retry',
  context: {
    venue_url: venue.url,
    menu_url: venue.menuUrl,
    venue_name: venue.name,
    country: venue.country,
    // Any other data needed for retry
  },
});
```

### 2. Use Appropriate Max Attempts

Different operations may need different retry limits:

```typescript
// Discovery: More retries (API might be temporarily unavailable)
await queueFailedOperation({
  type: 'discovery',
  max_attempts: 7, // Override default
  // ...
});

// Venue verification: Fewer retries (data issue, not transient)
await queueFailedOperation({
  type: 'venue_verification',
  max_attempts: 3,
  // ...
});
```

### 3. Monitor and Alert

Set up monitoring for DLQ health:

```typescript
async function checkDLQHealth() {
  const stats = await getDLQStats();

  // Alert if too many operations need manual review
  if (stats.requires_manual > 50) {
    sendAlert('DLQ has ' + stats.requires_manual + ' operations requiring manual review');
  }

  // Alert if pending retry is growing
  if (stats.pending_retry > 100) {
    sendAlert('DLQ has ' + stats.pending_retry + ' pending retries - possible systemic issue');
  }
}
```

### 4. Regular Cleanup

Schedule cleanup of old resolved operations:

```typescript
// Run weekly
export const cleanupDLQ = onSchedule('every sunday 00:00', async () => {
  const deleted = await cleanupResolvedOperations(30); // 30 days
  console.log(`DLQ cleanup: removed ${deleted} old resolved operations`);
});
```

### 5. Analyze Error Patterns

Look for common errors to identify systemic issues:

```typescript
async function analyzeErrorPatterns() {
  const failures = await getFailedOperations({
    status: 'requires_manual',
    limit: 100,
  });

  const errorCounts: Record<string, number> = {};
  failures.forEach((op) => {
    errorCounts[op.error] = (errorCounts[op.error] || 0) + 1;
  });

  // Log top errors
  Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([error, count]) => {
      console.log(`${count}x: ${error}`);
    });
}
```

## Testing

See `DeadLetterQueue.example.ts` for comprehensive usage examples and test scenarios.

## Related Services

- **CircuitBreaker**: Prevents cascade failures by short-circuiting failing operations
- **PlatformHealthMonitor**: Tracks platform availability and health metrics
- **MenuSnapshotService**: Detects menu changes over time

## References

- Implementation based on FUTURE-IMPROVEMENTS.md Section 6.1C
- Exponential backoff pattern: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- Dead Letter Queue concept: https://en.wikipedia.org/wiki/Dead_letter_queue
