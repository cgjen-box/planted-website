# Frontend Integration Guide - Scraper Control APIs

Quick reference for integrating the scraper control and budget monitoring APIs into Admin Dashboard 2.0.

## Quick Start

### 1. Get Available Scrapers
```typescript
const response = await fetch('/admin/scrapers/available', {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const data = await response.json();
// data.discovery.modes - Discovery options
// data.extraction.modes - Extraction options
// data.recentRuns - Last 10 runs
// data.runningScrapers - Currently running
```

### 2. Start Discovery Scraper
```typescript
const response = await fetch('/admin/scrapers/discovery/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    countries: ['CH', 'DE'],
    platforms: ['uber-eats', 'wolt'],
    mode: 'explore',
    maxQueries: 30,
    dryRun: false
  })
});

if (!response.ok) {
  if (response.status === 429) {
    // Budget throttled - show budget status to user
    const error = await response.json();
    alert(error.message);
    return;
  }
  throw new Error('Failed to start scraper');
}

const { runId, statusUrl, estimatedCost } = await response.json();
```

### 3. Stream Progress (Server-Sent Events)
```typescript
function streamScraperProgress(runId: string, token: string) {
  const url = `/admin/scrapers/runs/${runId}/stream`;

  // Note: EventSource doesn't support custom headers in standard browsers
  // Use polyfill or fetch + ReadableStream for Authorization header
  const eventSource = new EventSource(url);

  eventSource.addEventListener('init', (e) => {
    const data = JSON.parse(e.data);
    console.log('Scraper started:', data);
  });

  eventSource.addEventListener('update', (e) => {
    const data = JSON.parse(e.data);

    // Update UI
    updateProgressBar(data.progress.percentage);
    updateResults(data.results.found, data.results.processed);
    updateCosts(data.costs.estimated);

    // Show logs
    if (data.logs) {
      data.logs.forEach(log => addLogEntry(log));
    }

    // Show ETA
    if (data.eta) {
      showETA(new Date(data.eta));
    }
  });

  eventSource.addEventListener('done', (e) => {
    const data = JSON.parse(e.data);
    console.log('Scraper completed:', data.status);
    eventSource.close();

    // Show completion message
    if (data.status === 'completed') {
      showSuccess('Scraper completed successfully!');
    } else if (data.status === 'cancelled') {
      showWarning('Scraper was cancelled');
    } else {
      showError('Scraper failed');
    }
  });

  eventSource.addEventListener('error', (e) => {
    console.error('Stream error:', e);
    eventSource.close();
    showError('Connection lost');
  });

  eventSource.addEventListener('heartbeat', (e) => {
    // Connection is alive
    console.log('Heartbeat received');
  });

  return eventSource;
}
```

### 4. Cancel Scraper
```typescript
async function cancelScraper(runId: string, token: string) {
  const response = await fetch(`/admin/scrapers/runs/${runId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const result = await response.json();
  console.log('Cancelled by:', result.cancelledBy);
}
```

### 5. Check Budget Status
```typescript
async function getBudgetStatus(token: string) {
  const response = await fetch('/admin/budget/status', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  // Display budget usage
  console.log(`Daily: $${data.today.total} / $${data.limits.dailyBudget}`);
  console.log(`Monthly: $${data.month.total} / $${data.limits.monthlyBudget}`);

  if (data.isThrottled) {
    showWarning(`Budget throttled: ${data.throttleReason}`);
  }

  return data;
}
```

## React Component Examples

### Scraper Control Panel
```tsx
import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface ScraperRun {
  runId: string;
  status: string;
  progress: { current: number; total: number; percentage: number };
  costs: { estimated: number };
}

export function ScraperControlPanel() {
  const { token } = useAuth();
  const [runs, setRuns] = useState<ScraperRun[]>([]);
  const [budget, setBudget] = useState(null);

  useEffect(() => {
    loadAvailableScrapers();
    loadBudgetStatus();
  }, []);

  async function loadAvailableScrapers() {
    const response = await fetch('/admin/scrapers/available', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setRuns(data.recentRuns);
  }

  async function loadBudgetStatus() {
    const response = await fetch('/admin/budget/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setBudget(data);
  }

  async function startDiscovery(config) {
    const response = await fetch('/admin/scrapers/discovery/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      if (response.status === 429) {
        const error = await response.json();
        alert(`Budget throttled: ${error.message}`);
        return;
      }
      throw new Error('Failed to start scraper');
    }

    const { runId } = await response.json();

    // Add to runs list
    setRuns([...runs, { runId, status: 'pending', progress: { current: 0, total: 0, percentage: 0 }, costs: { estimated: 0 } }]);

    // Start streaming progress
    streamProgress(runId);
  }

  function streamProgress(runId: string) {
    const eventSource = new EventSource(`/admin/scrapers/runs/${runId}/stream`);

    eventSource.addEventListener('update', (e) => {
      const data = JSON.parse(e.data);

      // Update run in list
      setRuns(runs.map(run =>
        run.runId === runId ? { ...run, ...data } : run
      ));
    });

    eventSource.addEventListener('done', (e) => {
      const data = JSON.parse(e.data);
      eventSource.close();

      // Refresh budget status
      loadBudgetStatus();
    });
  }

  return (
    <div className="scraper-control-panel">
      {/* Budget status */}
      {budget && (
        <div className="budget-status">
          <h3>Budget Status</h3>
          <ProgressBar
            value={budget.today.percentage}
            max={100}
            label={`$${budget.today.total} / $${budget.limits.dailyBudget}`}
          />
          {budget.isThrottled && (
            <div className="alert alert-warning">
              {budget.throttleReason}
            </div>
          )}
        </div>
      )}

      {/* Start scraper form */}
      <StartScraperForm onSubmit={startDiscovery} />

      {/* Running scrapers */}
      <div className="scraper-runs">
        <h3>Active Scrapers</h3>
        {runs.map(run => (
          <ScraperRunCard key={run.runId} run={run} />
        ))}
      </div>
    </div>
  );
}
```

### Progress Card Component
```tsx
interface ScraperRunCardProps {
  run: ScraperRun;
}

export function ScraperRunCard({ run }: ScraperRunCardProps) {
  const { token } = useAuth();

  async function handleCancel() {
    if (!confirm('Cancel this scraper?')) return;

    await fetch(`/admin/scrapers/runs/${run.runId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }

  return (
    <div className="scraper-run-card">
      <div className="run-header">
        <span className="run-id">{run.runId}</span>
        <span className={`status status-${run.status}`}>{run.status}</span>
      </div>

      {run.progress && (
        <div className="progress">
          <ProgressBar value={run.progress.percentage} max={100} />
          <span>{run.progress.current} / {run.progress.total}</span>
        </div>
      )}

      {run.costs && (
        <div className="costs">
          Estimated cost: ${run.costs.estimated.toFixed(4)}
        </div>
      )}

      {['pending', 'running'].includes(run.status) && (
        <button onClick={handleCancel} className="btn-danger">
          Cancel
        </button>
      )}
    </div>
  );
}
```

## Error Handling

### Handle Budget Throttle
```typescript
try {
  const response = await fetch('/admin/scrapers/discovery/start', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  });

  if (response.status === 429) {
    const error = await response.json();

    // Show budget status to user
    showBudgetExceededDialog({
      message: error.message,
      currentCost: error.budgetStatus.currentCost,
      limit: error.budgetStatus.dailyLimit,
      percentage: error.budgetStatus.percentageUsed,
      remaining: error.budgetStatus.remainingBudget
    });

    return;
  }

  if (!response.ok) {
    throw new Error('Failed to start scraper');
  }

  // Success
  const result = await response.json();
  // ...
} catch (error) {
  console.error('Error starting scraper:', error);
  showError('Failed to start scraper. Please try again.');
}
```

### Handle Validation Errors
```typescript
if (response.status === 400) {
  const error = await response.json();

  if (error.details) {
    // Zod validation errors
    error.details.forEach(issue => {
      showFieldError(issue.path.join('.'), issue.message);
    });
  } else {
    showError(error.message);
  }
}
```

## TypeScript Types

```typescript
// Request types
interface StartDiscoveryRequest {
  countries: string[];
  platforms?: string[];
  mode: 'explore' | 'enumerate' | 'verify';
  chainId?: string;
  maxQueries?: number;
  dryRun?: boolean;
}

interface StartExtractionRequest {
  target: 'all' | 'chain' | 'venue';
  chainId?: string;
  venueId?: string;
  maxVenues?: number;
  mode: 'enrich' | 'refresh' | 'verify';
}

// Response types
interface ScraperStartResponse {
  runId: string;
  statusUrl: string;
  status: string;
  message: string;
  config: object;
  estimatedCost: number;
}

interface ProgressUpdate {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  results: {
    found: number;
    processed: number;
    errors: number;
  };
  costs: {
    searchQueries: number;
    aiCalls: number;
    estimated: number;
  };
  eta?: Date;
  logs?: LogEntry[];
}

interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
}

interface BudgetStatus {
  today: {
    total: number;
    percentage: number;
  };
  limits: {
    dailyBudget: number;
    monthlyBudget: number;
    throttleAt: number;
  };
  isThrottled: boolean;
  throttleReason?: string;
}
```

## Best Practices

1. **Always check budget status** before allowing users to start scrapers
2. **Show estimated costs** to users before starting
3. **Use SSE for real-time updates** instead of polling
4. **Handle connection errors gracefully** - reconnect if needed
5. **Show clear feedback** when budget is throttled
6. **Implement confirmation dialogs** for cancellation
7. **Store authentication token securely** - don't expose in URLs
8. **Cache budget status** for 30 seconds to reduce API calls
9. **Show loading states** during API calls
10. **Log errors** to monitoring service

## Testing

### Test in Development
```bash
# Start local API
cd packages/api
npm run serve

# Test endpoints
curl http://localhost:5001/admin/scrapers/available
curl -X POST http://localhost:5001/admin/scrapers/discovery/start \
  -H "Content-Type: application/json" \
  -d '{"countries": ["CH"], "mode": "explore", "maxQueries": 5, "dryRun": true}'
```

### Mock Data for Development
```typescript
// Mock budget status
export const mockBudgetStatus: BudgetStatus = {
  today: {
    total: 12.50,
    percentage: 25
  },
  limits: {
    dailyBudget: 50,
    monthlyBudget: 1000,
    throttleAt: 40
  },
  isThrottled: false
};

// Mock scraper run
export const mockScraperRun: ScraperRun = {
  runId: 'run_abc123',
  status: 'running',
  progress: { current: 15, total: 50, percentage: 30 },
  costs: { searchQueries: 15, aiCalls: 30, estimated: 0.05 }
};
```

## Troubleshooting

### SSE Not Working
- Check CORS configuration
- Verify Authorization header is being sent
- Use EventSource polyfill for custom headers
- Check browser console for errors

### Budget Always Throttled
- Check environment variables `DAILY_BUDGET_LIMIT`
- Verify budget tracking collection is working
- Check if there's old data from previous days

### Scraper Not Starting
- Check Firebase Authentication token is valid
- Verify user has `admin: true` custom claim
- Check server logs for errors
- Verify scraper path exists

### Progress Not Updating
- Ensure scraper process is calling `updateProgress()`
- Check Firestore rules allow updates
- Verify SSE connection is still active
- Check for network interruptions

## Additional Resources

- [Full API Documentation](./packages/api/src/functions/admin/scrapers/README.md)
- [Implementation Details](./SCRAPER_APIS_IMPLEMENTATION.md)
- [Database Schema](./SCRAPER_APIS_IMPLEMENTATION.md#database-schema)
- [Backend Integration Guide](./SCRAPER_APIS_IMPLEMENTATION.md#integration-example)

---

**For questions or support, contact the backend team.**
