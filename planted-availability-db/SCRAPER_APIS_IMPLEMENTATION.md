# Scraper Control & Budget APIs - Implementation Summary

## Overview

This document summarizes the complete implementation of the backend scraper control and budget monitoring APIs for Admin Dashboard 2.0.

## Files Created/Modified

### Database Layer

#### 1. Budget Tracking Collection
**File:** `packages/database/src/collections/budgetTracking.ts`
- New collection for tracking daily/monthly budget usage
- Tracks search queries (free/paid) and AI calls (Gemini/Claude)
- Calculates costs and records throttle events
- Methods for incrementing counters, updating costs, and querying history

#### 2. Enhanced Scraper Runs Collection
**File:** `packages/database/src/collections/scraper-runs.ts` (modified)
- Added new fields: `progress`, `costs`, `logs`, `cancelledAt`, `cancelledBy`, `config`
- New methods:
  - `updateProgress()` - Update run progress
  - `updateCosts()` - Update cost tracking
  - `addLog()` - Add log entries
  - `cancel()` - Cancel a run
  - `isCancelled()` - Check cancellation status
  - `startWithConfig()` - Start run with configuration
  - `markAsRunning()` - Update status to running

#### 3. Enhanced Core Types
**File:** `packages/core/src/types/scraper.ts` (modified)
- Added `ScraperProgress` interface
- Added `ScraperCosts` interface
- Added `ScraperLogEntry` interface
- Enhanced `ScraperStatus` with 'pending' and 'cancelled'
- Enhanced `ScraperRun` with new optional fields

#### 4. Database Index
**File:** `packages/database/src/collections/index.ts` (modified)
- Exported `budgetTracking` collection

### API Layer

#### 5. Budget Throttle Service
**File:** `packages/api/src/services/budgetThrottle.ts`
- Budget configuration with environment variable support
- `shouldThrottle()` - Check if budget throttling should be applied
- `estimateScraperCost()` - Estimate cost for a scraper run
- `canAffordScraperRun()` - Check if a run can be afforded
- `recordScraperCosts()` - Record actual costs from a run

#### 6. Start Discovery API
**File:** `packages/api/src/functions/admin/scrapers/startDiscovery.ts`
- POST endpoint to start discovery scrapers
- Request validation with Zod
- Budget throttle checking
- Spawns background process
- Returns runId and status URL

#### 7. Start Extraction API
**File:** `packages/api/src/functions/admin/scrapers/startExtraction.ts`
- POST endpoint to start extraction scrapers
- Target validation (all/chain/venue)
- Budget throttle checking
- Spawns background process
- Returns runId and status URL

#### 8. Progress Stream API
**File:** `packages/api/src/functions/admin/scrapers/stream.ts`
- GET endpoint for Server-Sent Events (SSE)
- Real-time Firestore listener
- Streams progress, costs, logs, and ETA
- Automatic cleanup on completion
- Heartbeat every 15 seconds

#### 9. Cancel API
**File:** `packages/api/src/functions/admin/scrapers/cancel.ts`
- POST endpoint to cancel running scrapers
- Validates run exists and is not in terminal state
- Records who cancelled and when
- Adds log entry

#### 10. Budget Status API
**File:** `packages/api/src/functions/admin/budget/status.ts`
- GET endpoint for budget status
- Returns today's and monthly usage
- Calculates throttle status
- Shows recent throttle events
- Includes percentage of budget used

#### 11. Available Scrapers API
**File:** `packages/api/src/functions/admin/scrapers/available.ts`
- GET endpoint for scraper metadata
- Lists available countries, platforms, modes
- Shows recent runs and currently running scrapers
- Provides statistics and estimates

#### 12. Scrapers Index
**File:** `packages/api/src/functions/admin/scrapers/index.ts`
- Exports all scraper endpoint handlers

#### 13. Budget Index
**File:** `packages/api/src/functions/admin/budget/index.ts`
- Exports budget endpoint handlers

#### 14. Admin Index
**File:** `packages/api/src/functions/admin/index.ts` (modified)
- Added exports for new scraper and budget endpoints

#### 15. API Documentation
**File:** `packages/api/src/functions/admin/scrapers/README.md`
- Comprehensive API documentation
- Request/response examples
- Authentication requirements
- Integration guidelines
- Testing instructions

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/scrapers/discovery/start` | POST | Start discovery scraper |
| `/admin/scrapers/extraction/start` | POST | Start extraction scraper |
| `/admin/scrapers/runs/:runId/stream` | GET | Stream progress (SSE) |
| `/admin/scrapers/runs/:runId/cancel` | POST | Cancel scraper run |
| `/admin/budget/status` | GET | Get budget status |
| `/admin/scrapers/available` | GET | Get available scrapers |

## Key Features

### 1. Auto-Throttling
- Checks budget before starting any scraper
- Configurable daily and monthly limits
- Automatic throttle at 80% of daily budget (configurable)
- Returns 429 status with budget details when throttled

### 2. Real-Time Progress
- Server-Sent Events (SSE) for live updates
- Progress percentage calculation
- ETA estimation based on current rate
- Real-time cost tracking
- Recent log entries

### 3. Budget Tracking
- Separate tracking for free and paid search queries
- AI call tracking by provider (Gemini/Claude)
- Cost calculation and aggregation
- Historical data for daily and monthly periods
- Throttle event logging

### 4. Cancellation Support
- Cancel scrapers at any time
- Records who cancelled and when
- Scraper processes can check `isCancelled()` periodically
- Prevents cancellation of already completed runs

### 5. Comprehensive Logging
- Structured log entries with timestamp and level
- Stored in scraper run document
- Limited to last 100 entries to avoid size issues
- Streamed to frontend in real-time

## Environment Variables

```bash
# Budget Configuration
DAILY_BUDGET_LIMIT=50              # USD (default: 50)
MONTHLY_BUDGET_LIMIT=1000          # USD (default: 1000)
BUDGET_THROTTLE_THRESHOLD=0.8      # 80% (default: 0.8)
```

## Database Schema

### scraper_runs Collection
```typescript
{
  id: string;
  scraper_id: string;
  started_at: Date;
  completed_at?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial' | 'cancelled';
  stats: {
    venues_checked: number;
    venues_updated: number;
    dishes_found: number;
    dishes_updated: number;
    errors: number;
  };
  errors?: Array<{ message: string; url?: string; stack?: string }>;
  next_run?: Date;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  costs?: {
    searchQueries: number;
    aiCalls: number;
    estimated: number;
  };
  logs?: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
  }>;
  cancelledAt?: Date;
  cancelledBy?: string;
  config?: object;
}
```

### budget_tracking Collection
```typescript
{
  id: string;              // YYYY-MM-DD
  date: string;            // YYYY-MM-DD
  searchQueries: {
    free: number;
    paid: number;
  };
  aiCalls: {
    gemini: number;
    claude: number;
  };
  costs: {
    search: number;        // USD
    ai: number;           // USD
    total: number;        // USD
  };
  throttleEvents: Array<{
    timestamp: Date;
    reason: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

## Integration Example

### Frontend Integration
```typescript
// Start a discovery scraper
const response = await fetch('/admin/scrapers/discovery/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    countries: ['CH', 'DE'],
    platforms: ['uber-eats', 'wolt'],
    mode: 'explore',
    maxQueries: 30
  })
});

const { runId, statusUrl } = await response.json();

// Stream progress
const eventSource = new EventSource(statusUrl, {
  headers: { 'Authorization': `Bearer ${token}` }
});

eventSource.addEventListener('update', (e) => {
  const data = JSON.parse(e.data);
  updateProgressBar(data.progress.percentage);
  updateStats(data.results);
  updateCosts(data.costs);
});

eventSource.addEventListener('done', (e) => {
  const data = JSON.parse(e.data);
  showCompletionMessage(data.status);
  eventSource.close();
});
```

### Scraper Process Integration
```typescript
// In scraper process
import { scraperRuns } from '@pad/database';
import { recordScraperCosts } from '../services/budgetThrottle.js';

const runId = process.argv.find(arg => arg.startsWith('--run-id='))?.split('=')[1];

// Mark as running
await scraperRuns.markAsRunning(runId);

// Main processing loop
for (let i = 0; i < items.length; i++) {
  // Check for cancellation
  if (await scraperRuns.isCancelled(runId)) {
    await scraperRuns.addLog(runId, 'warn', 'Scraper cancelled by user');
    process.exit(0);
  }

  // Update progress
  await scraperRuns.updateProgress(runId, i + 1, items.length);

  // Process item
  try {
    const result = await processItem(items[i]);
    await scraperRuns.addLog(runId, 'info', `Processed: ${result.name}`);
  } catch (error) {
    await scraperRuns.addLog(runId, 'error', error.message);
  }

  // Update costs
  await scraperRuns.updateCosts(runId, searchCount, aiCallCount, estimatedCost);
}

// Record final costs
await recordScraperCosts(freeQueries, paidQueries, geminiCalls, claudeCalls);

// Complete
await scraperRuns.complete(runId, 'completed', stats);
```

## Security Considerations

1. **Authentication:** All endpoints require Firebase ID token
2. **Authorization:** Endpoints require `admin: true` custom claim
3. **Input Validation:** Zod schemas validate all request bodies
4. **Budget Protection:** Auto-throttling prevents runaway costs
5. **Audit Trail:** All actions logged with user identification

## Testing Checklist

- [ ] Start discovery scraper with valid config
- [ ] Start discovery scraper with invalid config (should fail)
- [ ] Start scraper when budget throttled (should return 429)
- [ ] Stream scraper progress via SSE
- [ ] Cancel running scraper
- [ ] View budget status
- [ ] View available scrapers
- [ ] Test monthly budget limit
- [ ] Test scraper cost estimation
- [ ] Test log entry limits (max 100)

## Production Deployment Notes

1. **Replace spawn() with Cloud Run Jobs:**
   - Current implementation uses `spawn()` to run scrapers
   - In production, use Cloud Run Jobs or Cloud Tasks
   - Pass runId as environment variable or argument

2. **Configure CORS for SSE:**
   - SSE endpoints need proper CORS configuration
   - Allow credentials for authenticated SSE streams

3. **Set Budget Limits:**
   - Configure `DAILY_BUDGET_LIMIT` and `MONTHLY_BUDGET_LIMIT`
   - Adjust `BUDGET_THROTTLE_THRESHOLD` as needed
   - Update cost estimates in `budgetThrottle.ts` based on actual API pricing

4. **Monitoring:**
   - Set up alerts for budget threshold reached
   - Monitor scraper failure rates
   - Track API response times

5. **Cleanup:**
   - Schedule periodic cleanup of old scraper runs
   - Archive budget tracking data after 1 year

## Cost Estimates

Default estimates (configurable):
- Free search query: $0.00
- Paid search query: $0.005
- Gemini AI call: $0.0001
- Claude AI call: $0.0003

Example scraper costs:
- Discovery (50 queries, 100 AI calls): ~$0.04
- Extraction (10 venues, 50 AI calls): ~$0.01

## Next Steps

1. **Frontend Implementation:**
   - Build UI components for scraper control
   - Implement SSE event handling
   - Create budget dashboard

2. **Scraper Integration:**
   - Update existing scrapers to use new APIs
   - Implement cancellation checking
   - Add progress reporting

3. **Testing:**
   - Write integration tests
   - Test budget throttling scenarios
   - Verify SSE streaming

4. **Documentation:**
   - Add API examples to frontend docs
   - Create video tutorial for using scraper dashboard
   - Document troubleshooting procedures

## Support

For questions or issues:
- Check the README: `packages/api/src/functions/admin/scrapers/README.md`
- Review test examples in testing section
- Contact the development team

---

**Implementation Date:** 2025-12-09
**Agent:** Agent 3 (Backend Scraper Control & Budget APIs)
**Status:** Complete
