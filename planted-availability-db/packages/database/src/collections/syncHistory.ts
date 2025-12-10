import type { QueryDocumentSnapshot, DocumentData, Timestamp } from 'firebase-admin/firestore';
import { BaseCollection } from './base.js';
import { timestampToDate, createTimestamp } from '../firestore.js';

export interface SyncErrorRecord {
  entityId: string;
  entityType: 'venue' | 'dish';
  error: string;
}

export interface SyncHistoryDoc {
  id: string;
  executedAt: Date;
  executedBy: string;
  itemsSynced: {
    venues: string[];
    dishes: string[];
  };
  stats: {
    venuesAdded: number;
    venuesUpdated: number;
    dishesAdded: number;
    dishesUpdated: number;
    errors: number;
  };
  errors?: SyncErrorRecord[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Collection for tracking sync operations from discovered entities to production
 */
class SyncHistoryCollection extends BaseCollection<SyncHistoryDoc> {
  protected collectionName = 'sync_history';

  protected fromFirestore(doc: QueryDocumentSnapshot): SyncHistoryDoc {
    const data = doc.data();
    return {
      id: doc.id,
      executedAt: timestampToDate(data.executedAt),
      executedBy: data.executedBy,
      itemsSynced: data.itemsSynced || { venues: [], dishes: [] },
      stats: data.stats || {
        venuesAdded: 0,
        venuesUpdated: 0,
        dishesAdded: 0,
        dishesUpdated: 0,
        errors: 0,
      },
      errors: data.errors || [],
      created_at: timestampToDate(data.created_at),
      updated_at: timestampToDate(data.updated_at),
    };
  }

  protected toFirestore(data: Partial<SyncHistoryDoc>): DocumentData {
    const doc: DocumentData = {};

    if (data.executedAt !== undefined) doc.executedAt = createTimestamp(data.executedAt);
    if (data.executedBy !== undefined) doc.executedBy = data.executedBy;
    if (data.itemsSynced !== undefined) doc.itemsSynced = data.itemsSynced;
    if (data.stats !== undefined) doc.stats = data.stats;
    if (data.errors !== undefined) doc.errors = data.errors;
    if (data.created_at !== undefined) doc.created_at = createTimestamp(data.created_at);
    if (data.updated_at !== undefined) doc.updated_at = createTimestamp(data.updated_at);

    return doc;
  }

  /**
   * Create a new sync history record
   */
  async recordSync(
    executedBy: string,
    venueIds: string[],
    dishIds: string[],
    stats: SyncHistoryDoc['stats'],
    errors?: SyncErrorRecord[]
  ): Promise<SyncHistoryDoc> {
    const now = new Date();
    return this.create({
      executedAt: now,
      executedBy,
      itemsSynced: {
        venues: venueIds,
        dishes: dishIds,
      },
      stats,
      errors,
    });
  }

  /**
   * Get sync history with pagination
   */
  async getHistory(limit: number = 50, cursor?: string): Promise<{
    history: SyncHistoryDoc[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    let query = this.collection
      .orderBy('executedAt', 'desc')
      .limit(limit + 1);

    if (cursor) {
      const cursorDoc = await this.collection.doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;

    return {
      history: docs.map(doc => this.fromFirestore(doc)),
      nextCursor: hasMore ? docs[docs.length - 1].id : undefined,
      hasMore,
    };
  }

  /**
   * Get sync history for a date range
   */
  async getHistoryByDateRange(startDate: Date, endDate: Date): Promise<SyncHistoryDoc[]> {
    const snapshot = await this.collection
      .where('executedAt', '>=', createTimestamp(startDate))
      .where('executedAt', '<=', createTimestamp(endDate))
      .orderBy('executedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => this.fromFirestore(doc));
  }

  /**
   * Get sync history by user
   */
  async getHistoryByUser(userId: string, limit: number = 20): Promise<SyncHistoryDoc[]> {
    const snapshot = await this.collection
      .where('executedBy', '==', userId)
      .orderBy('executedAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => this.fromFirestore(doc));
  }

  /**
   * Get total sync stats for a period
   */
  async getAggregateStats(daysBack: number = 30): Promise<{
    totalSyncs: number;
    totalVenues: number;
    totalDishes: number;
    totalErrors: number;
    averageVenuesPerSync: number;
    averageDishesPerSync: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const history = await this.getHistoryByDateRange(cutoffDate, new Date());

    let totalVenues = 0;
    let totalDishes = 0;
    let totalErrors = 0;

    for (const record of history) {
      totalVenues += record.stats.venuesAdded + record.stats.venuesUpdated;
      totalDishes += record.stats.dishesAdded + record.stats.dishesUpdated;
      totalErrors += record.stats.errors;
    }

    return {
      totalSyncs: history.length,
      totalVenues,
      totalDishes,
      totalErrors,
      averageVenuesPerSync: history.length > 0 ? Math.round(totalVenues / history.length) : 0,
      averageDishesPerSync: history.length > 0 ? Math.round(totalDishes / history.length) : 0,
    };
  }

  /**
   * Get last sync record
   */
  async getLastSync(): Promise<SyncHistoryDoc | null> {
    const snapshot = await this.collection
      .orderBy('executedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return this.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Check if entity was synced
   */
  async wasEntitySynced(entityId: string, entityType: 'venue' | 'dish'): Promise<{
    wasSynced: boolean;
    syncRecord?: SyncHistoryDoc;
  }> {
    const fieldPath = entityType === 'venue' ? 'itemsSynced.venues' : 'itemsSynced.dishes';

    const snapshot = await this.collection
      .where(fieldPath, 'array-contains', entityId)
      .orderBy('executedAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { wasSynced: false };
    }

    return {
      wasSynced: true,
      syncRecord: this.fromFirestore(snapshot.docs[0]),
    };
  }
}

export const syncHistory = new SyncHistoryCollection();
