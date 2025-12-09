/**
 * Platform Health Monitor
 *
 * Tracks the health and availability of delivery platforms.
 * Records success/failure rates, response times, and patterns.
 * Used to make intelligent decisions about which platforms to query.
 */

import { getFirestore } from '@pad/database';

export type DeliveryPlatformName =
  | 'uber_eats'
  | 'wolt'
  | 'lieferando'
  | 'just_eat'
  | 'deliveroo'
  | 'smood';

export interface PlatformHealthMetrics {
  platform: DeliveryPlatformName;
  last_check: Date;
  is_available: boolean;
  success_rate_1h: number; // 0-1
  success_rate_24h: number; // 0-1
  avg_response_time_ms: number;
  last_error?: string;
  last_error_time?: Date;
  consecutive_failures: number;
  requests_1h: number;
  requests_24h: number;
}

export interface PlatformHealthEvent {
  platform: DeliveryPlatformName;
  timestamp: Date;
  success: boolean;
  response_time_ms: number;
  error?: string;
  url?: string;
  country?: string;
}

// In-memory cache for fast reads
const healthCache = new Map<DeliveryPlatformName, PlatformHealthMetrics>();
const recentEvents: PlatformHealthEvent[] = [];
const MAX_CACHED_EVENTS = 1000;

/**
 * Record a platform request result
 */
export async function recordPlatformEvent(event: Omit<PlatformHealthEvent, 'timestamp'>): Promise<void> {
  const fullEvent: PlatformHealthEvent = {
    ...event,
    timestamp: new Date(),
  };

  // Add to in-memory cache
  recentEvents.push(fullEvent);
  if (recentEvents.length > MAX_CACHED_EVENTS) {
    recentEvents.shift();
  }

  // Update health cache
  updateHealthCache(fullEvent);

  // Persist to Firestore (async, don't wait)
  persistEvent(fullEvent).catch((err) => {
    console.error('Failed to persist platform health event:', err);
  });
}

/**
 * Update the in-memory health cache with a new event
 */
function updateHealthCache(event: PlatformHealthEvent): void {
  const current = healthCache.get(event.platform) || createEmptyMetrics(event.platform);

  // Update consecutive failures
  if (event.success) {
    current.consecutive_failures = 0;
  } else {
    current.consecutive_failures++;
    current.last_error = event.error;
    current.last_error_time = event.timestamp;
  }

  current.last_check = event.timestamp;

  // Calculate rolling averages from recent events
  const platformEvents = recentEvents.filter((e) => e.platform === event.platform);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

  const events1h = platformEvents.filter((e) => e.timestamp.getTime() > oneHourAgo);
  const events24h = platformEvents.filter((e) => e.timestamp.getTime() > dayAgo);

  current.requests_1h = events1h.length;
  current.requests_24h = events24h.length;

  if (events1h.length > 0) {
    current.success_rate_1h = events1h.filter((e) => e.success).length / events1h.length;
  }

  if (events24h.length > 0) {
    current.success_rate_24h = events24h.filter((e) => e.success).length / events24h.length;
    current.avg_response_time_ms =
      events24h.reduce((sum, e) => sum + e.response_time_ms, 0) / events24h.length;
  }

  // Determine availability (available if success rate > 50% or fewer than 5 requests)
  current.is_available =
    current.consecutive_failures < 5 &&
    (current.requests_1h < 5 || current.success_rate_1h > 0.5);

  healthCache.set(event.platform, current);
}

/**
 * Create empty metrics for a platform
 */
function createEmptyMetrics(platform: DeliveryPlatformName): PlatformHealthMetrics {
  return {
    platform,
    last_check: new Date(),
    is_available: true,
    success_rate_1h: 1,
    success_rate_24h: 1,
    avg_response_time_ms: 0,
    consecutive_failures: 0,
    requests_1h: 0,
    requests_24h: 0,
  };
}

/**
 * Persist event to Firestore for historical analysis
 */
async function persistEvent(event: PlatformHealthEvent): Promise<void> {
  const db = getFirestore();

  // Store individual events (auto-cleanup after 7 days via TTL)
  await db.collection('platform_health_events').add({
    ...event,
    timestamp: event.timestamp,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // TTL: 7 days
  });

  // Update platform summary document
  const summaryRef = db.collection('platform_health').doc(event.platform);
  const metrics = healthCache.get(event.platform);

  if (metrics) {
    await summaryRef.set(
      {
        ...metrics,
        last_check: metrics.last_check,
        last_error_time: metrics.last_error_time || null,
        updated_at: new Date(),
      },
      { merge: true }
    );
  }
}

/**
 * Get current health metrics for a platform
 */
export function getPlatformHealth(platform: DeliveryPlatformName): PlatformHealthMetrics {
  return healthCache.get(platform) || createEmptyMetrics(platform);
}

/**
 * Get health metrics for all platforms
 */
export function getAllPlatformHealth(): PlatformHealthMetrics[] {
  const platforms: DeliveryPlatformName[] = [
    'uber_eats',
    'wolt',
    'lieferando',
    'just_eat',
    'deliveroo',
    'smood',
  ];

  return platforms.map((p) => getPlatformHealth(p));
}

/**
 * Check if a platform is currently healthy and should be queried
 */
export function isPlatformHealthy(platform: DeliveryPlatformName): boolean {
  const health = getPlatformHealth(platform);
  return health.is_available && health.consecutive_failures < 3;
}

/**
 * Get platforms sorted by health (healthiest first)
 */
export function getHealthyPlatformsByPriority(): DeliveryPlatformName[] {
  return getAllPlatformHealth()
    .filter((h) => h.is_available)
    .sort((a, b) => {
      // Sort by success rate, then by response time
      if (Math.abs(a.success_rate_1h - b.success_rate_1h) > 0.1) {
        return b.success_rate_1h - a.success_rate_1h;
      }
      return a.avg_response_time_ms - b.avg_response_time_ms;
    })
    .map((h) => h.platform);
}

/**
 * Load cached health data from Firestore on startup
 */
export async function loadHealthCache(): Promise<void> {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('platform_health').get();

    for (const doc of snapshot.docs) {
      const data = doc.data() as PlatformHealthMetrics;
      healthCache.set(data.platform, {
        ...data,
        last_check: data.last_check instanceof Date ? data.last_check : new Date(),
        last_error_time: data.last_error_time instanceof Date ? data.last_error_time : undefined,
      });
    }

    console.log(`Loaded health data for ${healthCache.size} platforms`);
  } catch (error) {
    console.error('Failed to load platform health cache:', error);
  }
}

/**
 * Get a summary of platform health for logging
 */
export function getHealthSummary(): string {
  const health = getAllPlatformHealth();
  const lines = health.map((h) => {
    const status = h.is_available ? '✓' : '✗';
    const rate = (h.success_rate_1h * 100).toFixed(0);
    return `${status} ${h.platform}: ${rate}% (${h.requests_1h} req/1h, ${h.avg_response_time_ms.toFixed(0)}ms)`;
  });
  return lines.join('\n');
}
