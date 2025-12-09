/**
 * Adapter Version Manager
 *
 * Manages versioning and health-based rollback for platform adapters.
 * Tracks adapter versions, monitors success rates, and automatically rolls back
 * to stable versions when adapters fail.
 *
 * Based on FUTURE-IMPROVEMENTS.md Section 3.6C
 */

import { getFirestore } from '@pad/database';
import {
  getPlatformHealth,
  type DeliveryPlatformName,
  type PlatformHealthMetrics,
} from './PlatformHealthMonitor.js';

export type AdapterStatus = 'active' | 'deprecated' | 'testing';

export interface AdapterVersion {
  platform: DeliveryPlatformName;
  version: string; // semver e.g., "1.2.3"
  deployed_at: Date;
  status: AdapterStatus;
  success_rate?: number; // 0-100
  changelog?: string;
  requests_tested?: number; // Number of requests processed with this version
  last_used?: Date;
  deprecated_at?: Date;
  deprecation_reason?: string;
}

export interface AdapterRegistry {
  getActiveVersion(platform: DeliveryPlatformName): Promise<AdapterVersion | null>;
  getAllVersions(platform: DeliveryPlatformName): Promise<AdapterVersion[]>;
  rollback(platform: DeliveryPlatformName): Promise<void>;
  setTestingVersion(platform: DeliveryPlatformName, version: string): Promise<void>;
  promoteToActive(platform: DeliveryPlatformName, version: string): Promise<void>;
}

export interface RollbackEvent {
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

// In-memory cache for fast lookups
const versionCache = new Map<DeliveryPlatformName, AdapterVersion>();
const rollbackHistory: RollbackEvent[] = [];
const MAX_CACHED_ROLLBACKS = 100;

// Auto-rollback thresholds
const AUTO_ROLLBACK_THRESHOLD = 30; // Success rate below 30%
const MIN_REQUESTS_FOR_ROLLBACK = 10; // Minimum requests before considering rollback

/**
 * Register a new adapter version
 */
export async function registerAdapterVersion(
  version: Omit<AdapterVersion, 'deployed_at' | 'last_used'>
): Promise<AdapterVersion> {
  const db = getFirestore();

  const fullVersion: AdapterVersion = {
    ...version,
    deployed_at: new Date(),
    last_used: new Date(),
    requests_tested: 0,
  };

  // If registering as active, deprecate current active version
  if (version.status === 'active') {
    await deprecateCurrentActive(version.platform, 'New version deployed');
  }

  // Save to Firestore
  await db.collection('adapter_versions').add({
    ...fullVersion,
    deployed_at: fullVersion.deployed_at,
    last_used: fullVersion.last_used,
  });

  console.log(
    `Registered adapter version ${version.version} for ${version.platform} (status: ${version.status})`
  );

  // Update cache if this is the active version
  if (version.status === 'active') {
    versionCache.set(version.platform, fullVersion);
  }

  return fullVersion;
}

/**
 * Deprecate the current active version for a platform
 */
async function deprecateCurrentActive(
  platform: DeliveryPlatformName,
  reason: string
): Promise<void> {
  const db = getFirestore();

  // Find current active version
  const snapshot = await db
    .collection('adapter_versions')
    .where('platform', '==', platform)
    .where('status', '==', 'active')
    .get();

  if (snapshot.empty) {
    return;
  }

  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.update(doc.ref, {
      status: 'deprecated',
      deprecated_at: new Date(),
      deprecation_reason: reason,
    });
  }

  await batch.commit();
  console.log(`Deprecated active version for ${platform}: ${reason}`);
}

/**
 * Get the currently active adapter version for a platform
 */
export async function getActiveAdapter(
  platform: DeliveryPlatformName
): Promise<AdapterVersion | null> {
  // Check cache first
  const cached = versionCache.get(platform);
  if (cached && cached.status === 'active') {
    return cached;
  }

  // Query Firestore
  const db = getFirestore();
  const snapshot = await db
    .collection('adapter_versions')
    .where('platform', '==', platform)
    .where('status', '==', 'active')
    .orderBy('deployed_at', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  const version: AdapterVersion = {
    platform: data.platform,
    version: data.version,
    deployed_at: data.deployed_at?.toDate() || new Date(),
    status: data.status,
    success_rate: data.success_rate,
    changelog: data.changelog,
    requests_tested: data.requests_tested,
    last_used: data.last_used?.toDate(),
    deprecated_at: data.deprecated_at?.toDate(),
    deprecation_reason: data.deprecation_reason,
  };

  // Update cache
  versionCache.set(platform, version);

  return version;
}

/**
 * Get all versions for a platform, sorted by deployment date
 */
export async function getAllVersions(
  platform: DeliveryPlatformName
): Promise<AdapterVersion[]> {
  const db = getFirestore();

  const snapshot = await db
    .collection('adapter_versions')
    .where('platform', '==', platform)
    .orderBy('deployed_at', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      platform: data.platform,
      version: data.version,
      deployed_at: data.deployed_at?.toDate() || new Date(),
      status: data.status,
      success_rate: data.success_rate,
      changelog: data.changelog,
      requests_tested: data.requests_tested,
      last_used: data.last_used?.toDate(),
      deprecated_at: data.deprecated_at?.toDate(),
      deprecation_reason: data.deprecation_reason,
    } as AdapterVersion;
  });
}

/**
 * Get the most recent deprecated version (for rollback)
 */
async function getPreviousStableVersion(
  platform: DeliveryPlatformName
): Promise<AdapterVersion | null> {
  const db = getFirestore();

  const snapshot = await db
    .collection('adapter_versions')
    .where('platform', '==', platform)
    .where('status', '==', 'deprecated')
    .orderBy('deployed_at', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    platform: data.platform,
    version: data.version,
    deployed_at: data.deployed_at?.toDate() || new Date(),
    status: data.status,
    success_rate: data.success_rate,
    changelog: data.changelog,
    requests_tested: data.requests_tested,
    last_used: data.last_used?.toDate(),
    deprecated_at: data.deprecated_at?.toDate(),
    deprecation_reason: data.deprecation_reason,
  };
}

/**
 * Roll back to the previous stable version
 */
export async function rollbackAdapter(platform: DeliveryPlatformName): Promise<void> {
  const db = getFirestore();

  // Get current active version
  const currentVersion = await getActiveAdapter(platform);
  if (!currentVersion) {
    throw new Error(`No active adapter version found for ${platform}`);
  }

  // Get previous stable version
  const previousVersion = await getPreviousStableVersion(platform);
  if (!previousVersion) {
    throw new Error(`No previous version available for rollback for ${platform}`);
  }

  // Get current health metrics
  const health = getPlatformHealth(platform);

  // Create rollback event
  const rollbackEvent: RollbackEvent = {
    id: '',
    platform,
    from_version: currentVersion.version,
    to_version: previousVersion.version,
    reason: `Automatic rollback due to low success rate (${health.success_rate_1h * 100}%)`,
    success_rate_before: health.success_rate_1h * 100,
    timestamp: new Date(),
    automatic: true,
    alert_sent: false,
  };

  // Record rollback event
  const eventRef = await db.collection('adapter_rollbacks').add({
    ...rollbackEvent,
    timestamp: rollbackEvent.timestamp,
  });
  rollbackEvent.id = eventRef.id;

  // Add to history cache
  rollbackHistory.push(rollbackEvent);
  if (rollbackHistory.length > MAX_CACHED_ROLLBACKS) {
    rollbackHistory.shift();
  }

  // Deprecate current version
  await deprecateCurrentActive(platform, `Rolled back to v${previousVersion.version}`);

  // Activate previous version
  const versionSnapshot = await db
    .collection('adapter_versions')
    .where('platform', '==', platform)
    .where('version', '==', previousVersion.version)
    .limit(1)
    .get();

  if (!versionSnapshot.empty) {
    await versionSnapshot.docs[0].ref.update({
      status: 'active',
      last_used: new Date(),
    });
  }

  // Update cache
  versionCache.set(platform, {
    ...previousVersion,
    status: 'active',
    last_used: new Date(),
  });

  console.log(
    `✓ Rolled back ${platform} from v${currentVersion.version} to v${previousVersion.version}`
  );

  // Send alert
  await sendRollbackAlert(rollbackEvent);
}

/**
 * Set a version to testing status
 */
export async function setTestingVersion(
  platform: DeliveryPlatformName,
  version: string
): Promise<void> {
  const db = getFirestore();

  const snapshot = await db
    .collection('adapter_versions')
    .where('platform', '==', platform)
    .where('version', '==', version)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error(`Version ${version} not found for ${platform}`);
  }

  await snapshot.docs[0].ref.update({
    status: 'testing',
    last_used: new Date(),
  });

  console.log(`Set ${platform} version ${version} to testing`);
}

/**
 * Promote a testing version to active
 */
export async function promoteToActive(
  platform: DeliveryPlatformName,
  version: string
): Promise<void> {
  const db = getFirestore();

  // Get the version to promote
  const snapshot = await db
    .collection('adapter_versions')
    .where('platform', '==', platform)
    .where('version', '==', version)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error(`Version ${version} not found for ${platform}`);
  }

  // Deprecate current active version
  await deprecateCurrentActive(platform, `Promoted v${version} to active`);

  // Activate new version
  await snapshot.docs[0].ref.update({
    status: 'active',
    last_used: new Date(),
  });

  // Update cache
  const data = snapshot.docs[0].data();
  versionCache.set(platform, {
    platform: data.platform,
    version: data.version,
    deployed_at: data.deployed_at?.toDate() || new Date(),
    status: 'active',
    success_rate: data.success_rate,
    changelog: data.changelog,
    requests_tested: data.requests_tested,
    last_used: new Date(),
  });

  console.log(`✓ Promoted ${platform} version ${version} to active`);
}

/**
 * Get health stats for an adapter based on platform health metrics
 */
export function getAdapterHealth(
  platform: DeliveryPlatformName
): PlatformHealthMetrics & { requires_rollback: boolean } {
  const health = getPlatformHealth(platform);

  const successRatePercent = health.success_rate_1h * 100;
  const requiresRollback =
    health.requests_1h >= MIN_REQUESTS_FOR_ROLLBACK &&
    successRatePercent < AUTO_ROLLBACK_THRESHOLD &&
    health.consecutive_failures >= 3;

  return {
    ...health,
    requires_rollback: requiresRollback,
  };
}

/**
 * Check if an adapter should be rolled back automatically
 * Returns true if success rate is below threshold with sufficient data
 */
export function shouldRollback(platform: DeliveryPlatformName): boolean {
  const health = getAdapterHealth(platform);
  return health.requires_rollback;
}

/**
 * Update adapter version statistics based on recent activity
 */
export async function updateAdapterStats(
  platform: DeliveryPlatformName,
  requestsProcessed: number
): Promise<void> {
  const db = getFirestore();
  const activeVersion = await getActiveAdapter(platform);

  if (!activeVersion) {
    return;
  }

  const health = getPlatformHealth(platform);
  const successRatePercent = health.success_rate_1h * 100;

  // Update version document
  const snapshot = await db
    .collection('adapter_versions')
    .where('platform', '==', platform)
    .where('version', '==', activeVersion.version)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!snapshot.empty) {
    await snapshot.docs[0].ref.update({
      success_rate: successRatePercent,
      requests_tested: (activeVersion.requests_tested || 0) + requestsProcessed,
      last_used: new Date(),
    });

    // Update cache
    versionCache.set(platform, {
      ...activeVersion,
      success_rate: successRatePercent,
      requests_tested: (activeVersion.requests_tested || 0) + requestsProcessed,
      last_used: new Date(),
    });
  }
}

/**
 * Check all platforms and perform auto-rollback if needed
 * Should be called periodically (e.g., every 5 minutes)
 */
export async function checkAndRollbackIfNeeded(): Promise<void> {
  const platforms: DeliveryPlatformName[] = [
    'uber_eats',
    'wolt',
    'lieferando',
    'just_eat',
    'deliveroo',
    'smood',
  ];

  for (const platform of platforms) {
    try {
      if (shouldRollback(platform)) {
        const health = getAdapterHealth(platform);
        console.warn(
          `⚠️  ${platform} adapter failing (${health.success_rate_1h * 100}% success rate, ${health.requests_1h} requests) - initiating rollback...`
        );
        await rollbackAdapter(platform);
      }
    } catch (error) {
      console.error(`Failed to check/rollback ${platform}:`, error);
    }
  }
}

/**
 * Send alert when rollback occurs
 */
async function sendRollbackAlert(event: RollbackEvent): Promise<void> {
  const db = getFirestore();

  // Record alert
  await db.collection('adapter_alerts').add({
    type: 'rollback',
    platform: event.platform,
    severity: 'high',
    message: `Adapter rolled back from v${event.from_version} to v${event.to_version}`,
    details: event,
    timestamp: new Date(),
    read: false,
  });

  // Update rollback event to mark alert as sent
  if (event.id) {
    await db.collection('adapter_rollbacks').doc(event.id).update({
      alert_sent: true,
    });
  }

  console.log(`🚨 ALERT: ${event.platform} adapter rolled back due to failures`);
  console.log(`   From: v${event.from_version}`);
  console.log(`   To: v${event.to_version}`);
  console.log(`   Success rate: ${event.success_rate_before.toFixed(1)}%`);
}

/**
 * Get recent rollback events
 */
export async function getRollbackHistory(
  limit = 20
): Promise<RollbackEvent[]> {
  const db = getFirestore();

  const snapshot = await db
    .collection('adapter_rollbacks')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      platform: data.platform,
      from_version: data.from_version,
      to_version: data.to_version,
      reason: data.reason,
      success_rate_before: data.success_rate_before,
      timestamp: data.timestamp?.toDate() || new Date(),
      automatic: data.automatic,
      alert_sent: data.alert_sent,
    } as RollbackEvent;
  });
}

/**
 * Get rollback history for a specific platform
 */
export async function getPlatformRollbackHistory(
  platform: DeliveryPlatformName,
  limit = 10
): Promise<RollbackEvent[]> {
  const db = getFirestore();

  const snapshot = await db
    .collection('adapter_rollbacks')
    .where('platform', '==', platform)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      platform: data.platform,
      from_version: data.from_version,
      to_version: data.to_version,
      reason: data.reason,
      success_rate_before: data.success_rate_before,
      timestamp: data.timestamp?.toDate() || new Date(),
      automatic: data.automatic,
      alert_sent: data.alert_sent,
    } as RollbackEvent;
  });
}

/**
 * Get a summary of adapter versions across all platforms
 */
export async function getAdapterSummary(): Promise<
  Array<{
    platform: DeliveryPlatformName;
    active_version: string | null;
    success_rate: number;
    health_status: 'healthy' | 'degraded' | 'failing';
    total_versions: number;
    last_rollback?: Date;
  }>
> {
  const platforms: DeliveryPlatformName[] = [
    'uber_eats',
    'wolt',
    'lieferando',
    'just_eat',
    'deliveroo',
    'smood',
  ];

  const summary = [];

  for (const platform of platforms) {
    const activeVersion = await getActiveAdapter(platform);
    const allVersions = await getAllVersions(platform);
    const health = getAdapterHealth(platform);
    const rollbacks = await getPlatformRollbackHistory(platform, 1);

    const successRatePercent = health.success_rate_1h * 100;
    let healthStatus: 'healthy' | 'degraded' | 'failing';

    if (successRatePercent >= 80) {
      healthStatus = 'healthy';
    } else if (successRatePercent >= 50) {
      healthStatus = 'degraded';
    } else {
      healthStatus = 'failing';
    }

    summary.push({
      platform,
      active_version: activeVersion?.version || null,
      success_rate: successRatePercent,
      health_status: healthStatus,
      total_versions: allVersions.length,
      last_rollback: rollbacks.length > 0 ? rollbacks[0].timestamp : undefined,
    });
  }

  return summary;
}

/**
 * Load version cache from Firestore on startup
 */
export async function loadVersionCache(): Promise<void> {
  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('adapter_versions')
      .where('status', '==', 'active')
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      versionCache.set(data.platform, {
        platform: data.platform,
        version: data.version,
        deployed_at: data.deployed_at?.toDate() || new Date(),
        status: data.status,
        success_rate: data.success_rate,
        changelog: data.changelog,
        requests_tested: data.requests_tested,
        last_used: data.last_used?.toDate(),
      });
    }

    console.log(`Loaded adapter versions for ${versionCache.size} platforms`);
  } catch (error) {
    console.error('Failed to load adapter version cache:', error);
  }
}

/**
 * Export the registry interface implementation
 */
export const adapterRegistry: AdapterRegistry = {
  getActiveVersion: getActiveAdapter,
  getAllVersions,
  rollback: rollbackAdapter,
  setTestingVersion,
  promoteToActive,
};
