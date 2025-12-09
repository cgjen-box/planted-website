# Adapter Version Manager

A comprehensive versioning and health-based rollback system for platform adapters (delivery platform scrapers).

## Overview

The Adapter Version Manager tracks different versions of platform adapters, monitors their success rates, and automatically rolls back to stable versions when adapters fail. This system is crucial for maintaining reliability when delivery platforms change their HTML structure or implement anti-bot measures.

Based on **FUTURE-IMPROVEMENTS.md Section 3.6C: Platform Adapter Versioning**.

## Features

### 1. Version Management
- **Register new adapter versions** with semver (e.g., "1.2.3")
- **Track version status**: `active`, `testing`, or `deprecated`
- **Maintain version history** with deployment dates and changelogs
- **Automatic deprecation** of old versions when new ones are activated

### 2. Health Monitoring
- **Integration with PlatformHealthMonitor** for real-time success rate tracking
- **Per-version statistics**: success rate, requests tested, last used date
- **Health status classification**: `healthy` (>80%), `degraded` (50-80%), `failing` (<50%)

### 3. Automatic Rollback
- **Threshold-based triggering**: Auto-rollback when success rate drops below 30%
- **Minimum request requirement**: At least 10 requests before considering rollback
- **Consecutive failure detection**: 3+ consecutive failures triggers rollback
- **Rollback history tracking**: All rollback events are logged with timestamps and reasons

### 4. Alerting System
- **Automatic alerts** when rollbacks occur
- **Alert details**: from/to versions, success rate, reason
- **Alert persistence** in Firestore collection `adapter_alerts`

## Data Model

### AdapterVersion
```typescript
interface AdapterVersion {
  platform: 'uber_eats' | 'wolt' | 'lieferando' | 'just_eat' | 'deliveroo' | 'smood';
  version: string;              // semver e.g., "1.2.3"
  deployed_at: Date;
  status: 'active' | 'deprecated' | 'testing';
  success_rate?: number;        // 0-100
  changelog?: string;
  requests_tested?: number;
  last_used?: Date;
  deprecated_at?: Date;
  deprecation_reason?: string;
}
```

### RollbackEvent
```typescript
interface RollbackEvent {
  id: string;
  platform: DeliveryPlatformName;
  from_version: string;
  to_version: string;
  reason: string;
  success_rate_before: number;
  timestamp: Date;
  automatic: boolean;
  alert_sent: boolean;
}
```

## Firestore Collections

### `adapter_versions`
Stores all adapter versions with their metadata.

**Indexes Required:**
```javascript
// Query active versions by platform
platform (Ascending), status (Ascending), deployed_at (Descending)

// Query all versions for a platform
platform (Ascending), deployed_at (Descending)

// Query by version
platform (Ascending), version (Ascending)
```

### `adapter_rollbacks`
Tracks all rollback events.

**Indexes Required:**
```javascript
// Recent rollbacks
timestamp (Descending)

// Platform-specific rollbacks
platform (Ascending), timestamp (Descending)
```

### `adapter_alerts`
Stores alerts for monitoring and notification systems.

**Indexes Required:**
```javascript
// Unread alerts
read (Ascending), timestamp (Descending)

// Platform alerts
platform (Ascending), timestamp (Descending)
```

## Usage Examples

### 1. Register a New Adapter Version

```typescript
import { registerAdapterVersion } from './AdapterVersionManager';

// Register a new testing version
await registerAdapterVersion({
  platform: 'uber_eats',
  version: '2.1.0',
  status: 'testing',
  changelog: 'Updated selectors for new menu layout',
});

// Register as active (auto-deprecates current active)
await registerAdapterVersion({
  platform: 'uber_eats',
  version: '2.1.0',
  status: 'active',
  changelog: 'Updated selectors for new menu layout',
});
```

### 2. Check Adapter Health

```typescript
import { getAdapterHealth, shouldRollback } from './AdapterVersionManager';

// Get detailed health metrics
const health = getAdapterHealth('uber_eats');
console.log(`Success rate: ${health.success_rate_1h * 100}%`);
console.log(`Requests (1h): ${health.requests_1h}`);
console.log(`Requires rollback: ${health.requires_rollback}`);

// Simple rollback check
if (shouldRollback('uber_eats')) {
  console.log('⚠️ Adapter needs rollback!');
}
```

### 3. Manual Rollback

```typescript
import { rollbackAdapter } from './AdapterVersionManager';

// Roll back to previous stable version
await rollbackAdapter('uber_eats');
// Console output:
// ✓ Rolled back uber_eats from v2.1.0 to v2.0.5
// 🚨 ALERT: uber_eats adapter rolled back due to failures
```

### 4. Promote Testing to Active

```typescript
import { setTestingVersion, promoteToActive } from './AdapterVersionManager';

// Set version to testing
await setTestingVersion('uber_eats', '2.1.0');

// After testing succeeds, promote to active
await promoteToActive('uber_eats', '2.1.0');
// Console output: ✓ Promoted uber_eats version 2.1.0 to active
```

### 5. Get Version History

```typescript
import { getAllVersions, getPlatformRollbackHistory } from './AdapterVersionManager';

// Get all versions for a platform
const versions = await getAllVersions('uber_eats');
for (const v of versions) {
  console.log(`v${v.version} - ${v.status} (${v.success_rate || 0}%)`);
}

// Get rollback history
const rollbacks = await getPlatformRollbackHistory('uber_eats', 5);
for (const rb of rollbacks) {
  console.log(`${rb.timestamp}: v${rb.from_version} → v${rb.to_version}`);
}
```

### 6. Get Adapter Summary (Dashboard)

```typescript
import { getAdapterSummary } from './AdapterVersionManager';

const summary = await getAdapterSummary();
for (const item of summary) {
  console.log(`${item.platform}:`);
  console.log(`  Active: v${item.active_version}`);
  console.log(`  Health: ${item.health_status} (${item.success_rate}%)`);
  console.log(`  Total versions: ${item.total_versions}`);
  if (item.last_rollback) {
    console.log(`  Last rollback: ${item.last_rollback.toISOString()}`);
  }
}
```

## Automated Monitoring

### Periodic Health Check (Recommended)

Set up a scheduled job to check adapter health every 5 minutes:

```typescript
import { checkAndRollbackIfNeeded } from './AdapterVersionManager';

// In a Cloud Function scheduled job
export const monitorAdapterHealth = onSchedule('every 5 minutes', async () => {
  await checkAndRollbackIfNeeded();
});
```

This function:
1. Checks all platforms
2. Evaluates if rollback is needed (success rate < 30%, 10+ requests)
3. Automatically rolls back failing adapters
4. Sends alerts for each rollback

### Update Statistics After Scraping

Update adapter stats after each scraping session:

```typescript
import { updateAdapterStats } from './AdapterVersionManager';

async function scrapeVenue(platform: string, url: string) {
  // ... scraping logic ...

  // Update stats for this adapter version
  await updateAdapterStats(platform as DeliveryPlatformName, 1);
}
```

## Auto-Rollback Logic

The system automatically rolls back an adapter when ALL conditions are met:

| Condition | Threshold | Reason |
|-----------|-----------|--------|
| Success rate | < 30% | Indicates severe failures |
| Requests tested | ≥ 10 | Ensures statistically significant sample |
| Consecutive failures | ≥ 3 | Confirms persistent issues |
| Previous version exists | Yes | Need a version to roll back to |

### Example Scenario

```
Time: 10:00 - Deploy uber_eats v2.1.0
Time: 10:05 - 5 requests, 60% success (no action)
Time: 10:10 - 15 requests total, 27% success, 4 consecutive failures
         → AUTO-ROLLBACK triggered
         → Rolled back to v2.0.5
         → Alert sent to adapter_alerts collection
```

## Integration Points

### 1. PlatformHealthMonitor
- Uses `getPlatformHealth()` to get real-time success rates
- Leverages existing health metrics infrastructure
- No duplicate tracking needed

### 2. Discovery & Scraping Agents
- Call `updateAdapterStats()` after each scraping operation
- Check `shouldRollback()` before starting large scraping runs
- Use `getActiveAdapter()` to log current version in run metadata

### 3. Admin Dashboard
- Display `getAdapterSummary()` on monitoring page
- Show `getRollbackHistory()` for audit trail
- Provide manual rollback button using `rollbackAdapter()`
- Allow promoting testing versions with `promoteToActive()`

## Cache Management

The system maintains in-memory caches for performance:

- **Version cache**: Active versions for each platform
- **Rollback history**: Recent 100 rollback events

### Initialization

Load caches on startup:

```typescript
import { loadVersionCache } from './AdapterVersionManager';

// On application startup
await loadVersionCache();
// Console output: Loaded adapter versions for 6 platforms
```

## Testing Strategy

### 1. Testing Flow for New Adapters

```typescript
// 1. Register as testing
await registerAdapterVersion({
  platform: 'uber_eats',
  version: '2.2.0',
  status: 'testing',
  changelog: 'Experimental: New DOM parser',
});

// 2. Run limited test scrapes
// ... test on 50-100 venues ...

// 3. Check success rate
const health = getAdapterHealth('uber_eats');
if (health.success_rate_1h > 0.9) {
  // 4. Promote to active
  await promoteToActive('uber_eats', '2.2.0');
}
```

### 2. Canary Deployments

For high-risk changes, use a canary approach:

1. Deploy new version as `testing`
2. Route 10% of traffic to new version
3. Monitor success rate for 1 hour
4. If success rate > 90%, promote to `active`
5. If success rate < 70%, deprecate and alert

## Best Practices

### 1. Version Numbering (Semver)
- **Major** (X.0.0): Breaking changes, new platform API
- **Minor** (1.X.0): New features, selector updates
- **Patch** (1.0.X): Bug fixes, small adjustments

### 2. Changelog Guidelines
- Be specific about what changed
- Include reason for change (e.g., "Platform changed menu structure")
- Reference related issues or PRs

### 3. Rollback Safety
- Always test new versions before deploying to production
- Keep at least 2 previous stable versions
- Document known issues in deprecation reasons

### 4. Monitoring
- Set up alerts for rollback events
- Review rollback history weekly
- Investigate patterns (frequent rollbacks = deeper issue)

## Troubleshooting

### Issue: Version Not Rolling Back
**Symptoms**: Success rate low but no rollback occurs

**Checks:**
1. Verify conditions are met (< 30% success, ≥10 requests, ≥3 failures)
2. Check if previous version exists
3. Ensure `checkAndRollbackIfNeeded()` is running

### Issue: False Positive Rollbacks
**Symptoms**: Adapter rolls back unnecessarily

**Solutions:**
1. Increase `MIN_REQUESTS_FOR_ROLLBACK` threshold
2. Lower `AUTO_ROLLBACK_THRESHOLD` percentage
3. Add minimum time window before rollback (e.g., 15 min)

### Issue: Missing Version History
**Symptoms**: Can't roll back, no previous versions found

**Solutions:**
1. Ensure versions are registered with correct status
2. Check Firestore collection `adapter_versions`
3. Don't delete deprecated versions (keep for history)

## Future Enhancements

### 1. Gradual Rollout
- Deploy new versions to percentage of traffic
- Automatically increase traffic if success rate high
- Full production deployment after validation

### 2. Multi-Region Support
- Track adapter versions per region
- Region-specific rollback logic
- Faster rollback for region-specific issues

### 3. AI-Powered Rollback Prediction
- Use ML to predict when adapters will fail
- Proactive version updates before failure
- Anomaly detection in success rate trends

### 4. Integration with CI/CD
- Automatic version registration on deploy
- Block deployment if no previous stable version
- Automated testing before promotion

## Related Documentation

- **FUTURE-IMPROVEMENTS.md Section 3.6**: Platform Resilience & Anti-Bot Handling
- **PlatformHealthMonitor.ts**: Health metrics tracking
- **SmartDiscoveryAgent.ts**: Discovery system integration

## Support

For issues or questions about the Adapter Version Manager:
1. Check Firestore collections for data integrity
2. Review console logs for rollback events
3. Examine `adapter_rollbacks` collection for history
4. Check `adapter_alerts` for unread notifications
