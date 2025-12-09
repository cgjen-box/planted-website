/**
 * Menu Snapshot Service
 *
 * Tracks menu changes over time for venues.
 * Detects when Planted dishes are added, removed, or changed.
 * Provides historical analysis and change notifications.
 */

import { getFirestore } from '@pad/database';
import type { DiscoveredDish } from '@pad/core';
import crypto from 'crypto';

export interface MenuSnapshot {
  id: string;
  venue_id: string;
  platform: string;
  snapshot_time: Date;
  dishes: DishSnapshot[];
  dish_count: number;
  planted_dish_count: number;
  hash: string; // For quick change detection
  metadata?: {
    source_url?: string;
    scrape_duration_ms?: number;
  };
}

export interface DishSnapshot {
  name: string;
  description?: string;
  price?: string;
  currency?: string;
  planted_product?: string;
  is_vegan?: boolean;
  hash: string;
}

export interface MenuChange {
  id: string;
  venue_id: string;
  platform: string;
  detected_at: Date;
  change_type: 'dish_added' | 'dish_removed' | 'dish_modified' | 'price_change';
  dish_name: string;
  planted_product?: string;
  old_value?: string;
  new_value?: string;
  snapshot_before_id?: string;
  snapshot_after_id: string;
}

/**
 * Create a hash of a dish for comparison
 */
function hashDish(dish: DishSnapshot): string {
  const normalized = {
    name: dish.name.toLowerCase().trim(),
    description: dish.description?.toLowerCase().trim() || '',
    price: dish.price || '',
    planted_product: dish.planted_product || '',
  };
  return crypto
    .createHash('md5')
    .update(JSON.stringify(normalized))
    .digest('hex');
}

/**
 * Create a hash of an entire menu
 */
function hashMenu(dishes: DishSnapshot[]): string {
  const dishHashes = dishes.map((d) => d.hash).sort();
  return crypto.createHash('md5').update(dishHashes.join(',')).digest('hex');
}

/**
 * Convert discovered dishes to snapshots
 */
export function dishesToSnapshots(dishes: DiscoveredDish[]): DishSnapshot[] {
  return dishes.map((dish) => {
    const snapshot: DishSnapshot = {
      name: dish.name,
      description: dish.description,
      price: dish.price,
      currency: dish.currency,
      planted_product: dish.planted_product,
      is_vegan: dish.is_vegan,
      hash: '',
    };
    snapshot.hash = hashDish(snapshot);
    return snapshot;
  });
}

/**
 * Create a new menu snapshot
 */
export async function createSnapshot(
  venueId: string,
  platform: string,
  dishes: DiscoveredDish[],
  metadata?: MenuSnapshot['metadata']
): Promise<MenuSnapshot> {
  const db = getFirestore();

  const dishSnapshots = dishesToSnapshots(dishes);
  const plantedDishes = dishSnapshots.filter((d) => d.planted_product);

  const snapshot: MenuSnapshot = {
    id: '', // Will be set after creation
    venue_id: venueId,
    platform,
    snapshot_time: new Date(),
    dishes: dishSnapshots,
    dish_count: dishSnapshots.length,
    planted_dish_count: plantedDishes.length,
    hash: hashMenu(dishSnapshots),
    metadata,
  };

  // Save to Firestore
  const docRef = await db.collection('menu_snapshots').add({
    ...snapshot,
    snapshot_time: snapshot.snapshot_time,
    // Store dishes in subcollection if too many
    dishes: dishSnapshots.length <= 50 ? dishSnapshots : [],
  });

  snapshot.id = docRef.id;

  // If many dishes, store in subcollection
  if (dishSnapshots.length > 50) {
    const batch = db.batch();
    for (const dish of dishSnapshots) {
      const dishRef = docRef.collection('dishes').doc();
      batch.set(dishRef, dish);
    }
    await batch.commit();
  }

  return snapshot;
}

/**
 * Get the most recent snapshot for a venue
 */
export async function getLatestSnapshot(
  venueId: string,
  platform: string
): Promise<MenuSnapshot | null> {
  const db = getFirestore();

  const querySnapshot = await db
    .collection('menu_snapshots')
    .where('venue_id', '==', venueId)
    .where('platform', '==', platform)
    .orderBy('snapshot_time', 'desc')
    .limit(1)
    .get();

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  const data = doc.data();

  // Load dishes from subcollection if needed
  let dishes = data.dishes || [];
  if (dishes.length === 0) {
    const dishesSnapshot = await doc.ref.collection('dishes').get();
    dishes = dishesSnapshot.docs.map((d) => d.data() as DishSnapshot);
  }

  return {
    id: doc.id,
    venue_id: data.venue_id,
    platform: data.platform,
    snapshot_time: data.snapshot_time.toDate(),
    dishes,
    dish_count: data.dish_count,
    planted_dish_count: data.planted_dish_count,
    hash: data.hash,
    metadata: data.metadata,
  };
}

/**
 * Compare two snapshots and detect changes
 */
export function compareSnapshots(
  before: MenuSnapshot | null,
  after: MenuSnapshot
): MenuChange[] {
  const changes: MenuChange[] = [];
  const now = new Date();

  if (!before) {
    // First snapshot - all dishes are "new"
    for (const dish of after.dishes.filter((d) => d.planted_product)) {
      changes.push({
        id: '',
        venue_id: after.venue_id,
        platform: after.platform,
        detected_at: now,
        change_type: 'dish_added',
        dish_name: dish.name,
        planted_product: dish.planted_product,
        new_value: dish.name,
        snapshot_after_id: after.id,
      });
    }
    return changes;
  }

  // Quick check - if hashes match, no changes
  if (before.hash === after.hash) {
    return changes;
  }

  // Build lookup maps
  const beforeByName = new Map<string, DishSnapshot>();
  const afterByName = new Map<string, DishSnapshot>();

  for (const dish of before.dishes) {
    beforeByName.set(dish.name.toLowerCase(), dish);
  }

  for (const dish of after.dishes) {
    afterByName.set(dish.name.toLowerCase(), dish);
  }

  // Find removed dishes (in before but not in after)
  for (const [name, dish] of beforeByName) {
    if (!afterByName.has(name) && dish.planted_product) {
      changes.push({
        id: '',
        venue_id: after.venue_id,
        platform: after.platform,
        detected_at: now,
        change_type: 'dish_removed',
        dish_name: dish.name,
        planted_product: dish.planted_product,
        old_value: dish.name,
        snapshot_before_id: before.id,
        snapshot_after_id: after.id,
      });
    }
  }

  // Find added dishes (in after but not in before)
  for (const [name, dish] of afterByName) {
    if (!beforeByName.has(name) && dish.planted_product) {
      changes.push({
        id: '',
        venue_id: after.venue_id,
        platform: after.platform,
        detected_at: now,
        change_type: 'dish_added',
        dish_name: dish.name,
        planted_product: dish.planted_product,
        new_value: dish.name,
        snapshot_before_id: before.id,
        snapshot_after_id: after.id,
      });
    }
  }

  // Find modified dishes
  for (const [name, beforeDish] of beforeByName) {
    const afterDish = afterByName.get(name);
    if (afterDish && beforeDish.planted_product) {
      // Check for price change
      if (beforeDish.price !== afterDish.price) {
        changes.push({
          id: '',
          venue_id: after.venue_id,
          platform: after.platform,
          detected_at: now,
          change_type: 'price_change',
          dish_name: beforeDish.name,
          planted_product: beforeDish.planted_product,
          old_value: beforeDish.price,
          new_value: afterDish.price,
          snapshot_before_id: before.id,
          snapshot_after_id: after.id,
        });
      }

      // Check for other modifications
      if (beforeDish.hash !== afterDish.hash && beforeDish.price === afterDish.price) {
        changes.push({
          id: '',
          venue_id: after.venue_id,
          platform: after.platform,
          detected_at: now,
          change_type: 'dish_modified',
          dish_name: beforeDish.name,
          planted_product: beforeDish.planted_product,
          snapshot_before_id: before.id,
          snapshot_after_id: after.id,
        });
      }
    }
  }

  return changes;
}

/**
 * Record detected changes to Firestore
 */
export async function recordChanges(changes: MenuChange[]): Promise<void> {
  if (changes.length === 0) return;

  const db = getFirestore();
  const batch = db.batch();

  for (const change of changes) {
    const ref = db.collection('menu_changes').doc();
    change.id = ref.id;
    batch.set(ref, {
      ...change,
      detected_at: change.detected_at,
    });
  }

  await batch.commit();

  console.log(`Recorded ${changes.length} menu changes`);
}

/**
 * Get recent changes for a venue
 */
export async function getRecentChanges(
  venueId: string,
  limit = 20
): Promise<MenuChange[]> {
  const db = getFirestore();

  const snapshot = await db
    .collection('menu_changes')
    .where('venue_id', '==', venueId)
    .orderBy('detected_at', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      venue_id: data.venue_id,
      platform: data.platform,
      detected_at: data.detected_at.toDate(),
      change_type: data.change_type,
      dish_name: data.dish_name,
      planted_product: data.planted_product,
      old_value: data.old_value,
      new_value: data.new_value,
      snapshot_before_id: data.snapshot_before_id,
      snapshot_after_id: data.snapshot_after_id,
    } as MenuChange;
  });
}

/**
 * Full workflow: Create snapshot and detect changes
 */
export async function snapshotAndDetectChanges(
  venueId: string,
  platform: string,
  dishes: DiscoveredDish[],
  metadata?: MenuSnapshot['metadata']
): Promise<{ snapshot: MenuSnapshot; changes: MenuChange[] }> {
  // Get previous snapshot
  const previousSnapshot = await getLatestSnapshot(venueId, platform);

  // Create new snapshot
  const newSnapshot = await createSnapshot(venueId, platform, dishes, metadata);

  // Compare and detect changes
  const changes = compareSnapshots(previousSnapshot, newSnapshot);

  // Record changes
  if (changes.length > 0) {
    await recordChanges(changes);
  }

  return { snapshot: newSnapshot, changes };
}

/**
 * Get change summary for reporting
 */
export async function getChangeSummary(
  sinceDate: Date,
  venueId?: string
): Promise<{
  added: number;
  removed: number;
  modified: number;
  priceChanges: number;
  byVenue: Map<string, number>;
}> {
  const db = getFirestore();

  let query = db
    .collection('menu_changes')
    .where('detected_at', '>=', sinceDate);

  if (venueId) {
    query = query.where('venue_id', '==', venueId);
  }

  const snapshot = await query.get();

  const summary = {
    added: 0,
    removed: 0,
    modified: 0,
    priceChanges: 0,
    byVenue: new Map<string, number>(),
  };

  for (const doc of snapshot.docs) {
    const data = doc.data();

    switch (data.change_type) {
      case 'dish_added':
        summary.added++;
        break;
      case 'dish_removed':
        summary.removed++;
        break;
      case 'dish_modified':
        summary.modified++;
        break;
      case 'price_change':
        summary.priceChanges++;
        break;
    }

    const venueCount = summary.byVenue.get(data.venue_id) || 0;
    summary.byVenue.set(data.venue_id, venueCount + 1);
  }

  return summary;
}
