# Adapter Version Manager - Quick Start Guide

Get the Adapter Version Manager up and running in 5 minutes.

## Installation

The system is already integrated into the `@pad/scrapers` package. No additional installation needed.

## Step 1: Deploy Firestore Indexes (One-Time Setup)

```bash
# Navigate to the project root
cd planted-availability-db

# Deploy the indexes
firebase deploy --only firestore:indexes

# Or manually create indexes from:
# packages/scrapers/FIRESTORE_INDEXES_ADAPTER_VERSION.json
```

## Step 2: Initialize on Startup

Add this to your application startup code:

```typescript
import { loadVersionCache } from '@pad/scrapers';

async function startup() {
  // Load adapter version cache from Firestore
  await loadVersionCache();
  console.log('✓ Adapter version cache loaded');
}

startup();
```

## Step 3: Register Initial Versions

Run this once to register current adapter versions:

```typescript
import { registerAdapterVersion } from '@pad/scrapers';

async function registerInitialVersions() {
  const platforms = [
    'uber_eats',
    'wolt',
    'lieferando',
    'just_eat',
    'deliveroo',
    'smood'
  ];

  for (const platform of platforms) {
    await registerAdapterVersion({
      platform,
      version: '1.0.0',
      status: 'active',
      changelog: 'Initial version registration',
    });
    console.log(`✓ Registered ${platform} v1.0.0`);
  }
}

registerInitialVersions();
```

## Step 4: Set Up Automated Monitoring

Create a Cloud Function to monitor adapter health:

```typescript
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { checkAndRollbackIfNeeded } from '@pad/scrapers';

export const monitorAdapterHealth = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Europe/Zurich',
  },
  async () => {
    console.log('Running adapter health check...');
    await checkAndRollbackIfNeeded();
    console.log('✓ Health check complete');
  }
);
```

Deploy the function:
```bash
firebase deploy --only functions:monitorAdapterHealth
```

## Step 5: Integrate with Scraping Flow

Add stats updates to your scraping functions:

```typescript
import { updateAdapterStats } from '@pad/scrapers';
import type { DeliveryPlatformName } from '@pad/scrapers';

async function scrapeVenue(platform: DeliveryPlatformName, url: string) {
  try {
    // Your scraping logic
    const result = await performScrape(url);

    // Update adapter stats on success
    await updateAdapterStats(platform, 1);

    return result;
  } catch (error) {
    // Error is tracked by PlatformHealthMonitor
    throw error;
  }
}
```

## Step 6: Add to Admin Dashboard (Optional)

Display adapter status in your admin UI:

```typescript
import { getAdapterSummary } from '@pad/scrapers';

async function AdapterStatusPage() {
  const summary = await getAdapterSummary();

  return (
    <div>
      <h1>Platform Adapter Status</h1>
      <table>
        <thead>
          <tr>
            <th>Platform</th>
            <th>Version</th>
            <th>Health</th>
            <th>Success Rate</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(item => (
            <tr key={item.platform}>
              <td>{item.platform}</td>
              <td>v{item.active_version}</td>
              <td>
                {item.health_status === 'healthy' ? '🟢' :
                 item.health_status === 'degraded' ? '🟡' : '🔴'}
                {item.health_status}
              </td>
              <td>{item.success_rate.toFixed(1)}%</td>
              <td>
                <button onClick={() => rollback(item.platform)}>
                  Rollback
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Common Operations

### Deploy a New Adapter Version

```typescript
import { registerAdapterVersion, promoteToActive } from '@pad/scrapers';

// 1. Deploy as testing first
await registerAdapterVersion({
  platform: 'uber_eats',
  version: '2.1.0',
  status: 'testing',
  changelog: 'Updated selectors for new menu layout',
});

// 2. Test with limited traffic
// ... run tests ...

// 3. Promote to active if successful
await promoteToActive('uber_eats', '2.1.0');
```

### Check Adapter Health

```typescript
import { getAdapterHealth, shouldRollback } from '@pad/scrapers';

const health = getAdapterHealth('uber_eats');
console.log(`Success rate: ${health.success_rate_1h * 100}%`);
console.log(`Needs rollback: ${shouldRollback('uber_eats')}`);
```

### Manual Rollback

```typescript
import { rollbackAdapter } from '@pad/scrapers';

await rollbackAdapter('uber_eats');
// Output: ✓ Rolled back uber_eats from v2.1.0 to v2.0.5
```

### View Version History

```typescript
import { getAllVersions } from '@pad/scrapers';

const versions = await getAllVersions('uber_eats');
for (const v of versions) {
  console.log(`v${v.version} - ${v.status} (${v.success_rate}%)`);
}
```

### View Rollback History

```typescript
import { getPlatformRollbackHistory } from '@pad/scrapers';

const rollbacks = await getPlatformRollbackHistory('uber_eats', 5);
for (const rb of rollbacks) {
  console.log(`${rb.timestamp}: v${rb.from_version} → v${rb.to_version}`);
  console.log(`  Reason: ${rb.reason}`);
}
```

## Verification

### Test the System

Run these commands to verify everything is working:

```typescript
// 1. Check cache is loaded
import { getActiveAdapter } from '@pad/scrapers';
const active = await getActiveAdapter('uber_eats');
console.log('Active version:', active?.version); // Should print version

// 2. Check health monitoring
import { getAdapterHealth } from '@pad/scrapers';
const health = getAdapterHealth('uber_eats');
console.log('Health:', health); // Should print metrics

// 3. Check Firestore collections exist
// Go to Firebase Console → Firestore Database
// Verify collections: adapter_versions, adapter_rollbacks, adapter_alerts
```

## Troubleshooting

### Issue: "No active adapter version found"

**Solution:** Register an initial version:
```typescript
await registerAdapterVersion({
  platform: 'uber_eats',
  version: '1.0.0',
  status: 'active',
  changelog: 'Initial version',
});
```

### Issue: "No previous version available for rollback"

**Solution:** You need at least 2 versions (one active, one deprecated) to rollback.

### Issue: Auto-rollback not triggering

**Check:**
1. Is the scheduled function running? (Check Cloud Functions logs)
2. Are conditions met? (< 30% success, >= 10 requests, >= 3 failures)
3. Does a previous version exist?

```typescript
// Debug auto-rollback
import { shouldRollback, getAdapterHealth } from '@pad/scrapers';

const health = getAdapterHealth('uber_eats');
console.log('Should rollback:', shouldRollback('uber_eats'));
console.log('Success rate:', health.success_rate_1h * 100);
console.log('Requests:', health.requests_1h);
console.log('Failures:', health.consecutive_failures);
```

## Configuration

### Adjust Auto-Rollback Thresholds

Edit `src/services/AdapterVersionManager.ts`:

```typescript
// Current values
const AUTO_ROLLBACK_THRESHOLD = 30; // Success rate < 30%
const MIN_REQUESTS_FOR_ROLLBACK = 10; // At least 10 requests

// Adjust as needed based on your requirements
```

### Change Monitoring Frequency

Edit your Cloud Function schedule:

```typescript
export const monitorAdapterHealth = onSchedule(
  {
    schedule: 'every 5 minutes', // Change to 'every 10 minutes', etc.
    timeZone: 'Europe/Zurich',
  },
  async () => {
    await checkAndRollbackIfNeeded();
  }
);
```

## Best Practices

### 1. Always Test New Versions
- Deploy as `testing` first
- Run on limited traffic
- Monitor for 30-60 minutes
- Promote to `active` only if stable

### 2. Keep Version History
- Don't delete deprecated versions
- They're needed for rollback
- Use changelog for documentation

### 3. Monitor Rollback Events
- Check rollback history weekly
- Investigate patterns (frequent rollbacks)
- Update adapters proactively

### 4. Use Semantic Versioning
- Major (X.0.0): Breaking changes
- Minor (1.X.0): New features
- Patch (1.0.X): Bug fixes

### 5. Document Changes
- Write clear changelogs
- Include reason for changes
- Reference related issues

## Next Steps

1. **Set up monitoring dashboard** - Display adapter status in admin UI
2. **Configure alerts** - Send notifications on rollback events
3. **Add metrics tracking** - Monitor rollback frequency and success rates
4. **Plan adapter updates** - Schedule regular adapter maintenance
5. **Test rollback scenarios** - Verify auto-rollback works as expected

## Resources

- **Full Documentation:** `ADAPTER_VERSION_MANAGER.md`
- **Architecture Diagram:** `ADAPTER_VERSION_MANAGER_ARCHITECTURE.md`
- **Usage Examples:** `AdapterVersionManager.example.ts`
- **Implementation Summary:** `ADAPTER_VERSION_MANAGER_SUMMARY.md`

## Support

For issues or questions:
1. Check Firestore collections for data integrity
2. Review Cloud Functions logs for errors
3. Examine `adapter_rollbacks` for history
4. Check `adapter_alerts` for notifications

---

**Quick Start Version:** 1.0
**Last Updated:** December 9, 2024
**Status:** ✅ Ready for deployment
