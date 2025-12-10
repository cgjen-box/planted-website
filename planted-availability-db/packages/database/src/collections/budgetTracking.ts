import type { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import { getFirestore, createTimestamp, timestampToDate } from '../firestore.js';

export interface ThrottleEvent {
  timestamp: Date;
  reason: string;
}

export interface BudgetTrackingDoc {
  id: string; // Date string YYYY-MM-DD
  date: string; // YYYY-MM-DD
  searchQueries: {
    free: number;
    paid: number;
  };
  aiCalls: {
    gemini: number;
    claude: number;
  };
  costs: {
    search: number; // Total search costs in USD
    ai: number; // Total AI costs in USD
    total: number; // Combined total in USD
  };
  throttleEvents: ThrottleEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export class BudgetTrackingCollection {
  private collectionName = 'budget_tracking';

  private get db() {
    return getFirestore();
  }

  private get collection() {
    return this.db.collection(this.collectionName);
  }

  protected fromFirestore(doc: QueryDocumentSnapshot): BudgetTrackingDoc {
    const data = doc.data();
    return {
      id: doc.id,
      date: data.date,
      searchQueries: data.searchQueries || { free: 0, paid: 0 },
      aiCalls: data.aiCalls || { gemini: 0, claude: 0 },
      costs: data.costs || { search: 0, ai: 0, total: 0 },
      throttleEvents: (data.throttleEvents || []).map((e: any) => ({
        timestamp: timestampToDate(e.timestamp),
        reason: e.reason,
      })),
      createdAt: timestampToDate(data.createdAt),
      updatedAt: timestampToDate(data.updatedAt),
    };
  }

  protected toFirestore(data: Partial<BudgetTrackingDoc>): DocumentData {
    const result: DocumentData = { ...data };
    delete result.id;

    if (data.throttleEvents) {
      result.throttleEvents = data.throttleEvents.map((e) => ({
        timestamp: createTimestamp(e.timestamp),
        reason: e.reason,
      }));
    }

    if (data.createdAt) {
      result.createdAt = createTimestamp(data.createdAt);
    }

    if (data.updatedAt) {
      result.updatedAt = createTimestamp(data.updatedAt);
    }

    return result;
  }

  /**
   * Get or create today's budget tracking document
   */
  async getTodayBudget(): Promise<BudgetTrackingDoc> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const docRef = this.collection.doc(today);
    const doc = await docRef.get();

    if (doc.exists) {
      return this.fromFirestore(doc as QueryDocumentSnapshot);
    }

    // Create new document for today
    const now = new Date();
    const newDoc: BudgetTrackingDoc = {
      id: today,
      date: today,
      searchQueries: { free: 0, paid: 0 },
      aiCalls: { gemini: 0, claude: 0 },
      costs: { search: 0, ai: 0, total: 0 },
      throttleEvents: [],
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(this.toFirestore(newDoc));
    return newDoc;
  }

  /**
   * Get budget for a specific date
   */
  async getBudgetByDate(date: string): Promise<BudgetTrackingDoc | null> {
    const doc = await this.collection.doc(date).get();
    if (!doc.exists) {
      return null;
    }
    return this.fromFirestore(doc as QueryDocumentSnapshot);
  }

  /**
   * Increment search query count
   */
  async incrementSearchQueries(type: 'free' | 'paid', count: number = 1): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const docRef = this.collection.doc(today);

    await this.db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const now = new Date();

      if (!doc.exists) {
        // Create new document
        const newDoc = {
          date: today,
          searchQueries: { free: type === 'free' ? count : 0, paid: type === 'paid' ? count : 0 },
          aiCalls: { gemini: 0, claude: 0 },
          costs: { search: 0, ai: 0, total: 0 },
          throttleEvents: [],
          createdAt: createTimestamp(now),
          updatedAt: createTimestamp(now),
        };
        transaction.set(docRef, newDoc);
      } else {
        // Update existing
        const data = doc.data()!;
        const searchQueries = data.searchQueries || { free: 0, paid: 0 };
        searchQueries[type] = (searchQueries[type] || 0) + count;

        transaction.update(docRef, {
          searchQueries,
          updatedAt: createTimestamp(now),
        });
      }
    });
  }

  /**
   * Increment AI call count
   */
  async incrementAICalls(provider: 'gemini' | 'claude', count: number = 1): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const docRef = this.collection.doc(today);

    await this.db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const now = new Date();

      if (!doc.exists) {
        // Create new document
        const newDoc = {
          date: today,
          searchQueries: { free: 0, paid: 0 },
          aiCalls: { gemini: provider === 'gemini' ? count : 0, claude: provider === 'claude' ? count : 0 },
          costs: { search: 0, ai: 0, total: 0 },
          throttleEvents: [],
          createdAt: createTimestamp(now),
          updatedAt: createTimestamp(now),
        };
        transaction.set(docRef, newDoc);
      } else {
        // Update existing
        const data = doc.data()!;
        const aiCalls = data.aiCalls || { gemini: 0, claude: 0 };
        aiCalls[provider] = (aiCalls[provider] || 0) + count;

        transaction.update(docRef, {
          aiCalls,
          updatedAt: createTimestamp(now),
        });
      }
    });
  }

  /**
   * Update costs (called after API calls with actual costs)
   */
  async updateCosts(searchCost: number = 0, aiCost: number = 0): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const docRef = this.collection.doc(today);

    await this.db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      const now = new Date();

      if (!doc.exists) {
        // Create new document
        const newDoc = {
          date: today,
          searchQueries: { free: 0, paid: 0 },
          aiCalls: { gemini: 0, claude: 0 },
          costs: {
            search: searchCost,
            ai: aiCost,
            total: searchCost + aiCost,
          },
          throttleEvents: [],
          createdAt: createTimestamp(now),
          updatedAt: createTimestamp(now),
        };
        transaction.set(docRef, newDoc);
      } else {
        // Update existing
        const data = doc.data()!;
        const costs = data.costs || { search: 0, ai: 0, total: 0 };
        costs.search = (costs.search || 0) + searchCost;
        costs.ai = (costs.ai || 0) + aiCost;
        costs.total = costs.search + costs.ai;

        transaction.update(docRef, {
          costs,
          updatedAt: createTimestamp(now),
        });
      }
    });
  }

  /**
   * Add throttle event
   */
  async addThrottleEvent(reason: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const docRef = this.collection.doc(today);
    const now = new Date();

    await this.db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      if (!doc.exists) {
        // Create new document with throttle event
        const newDoc = {
          date: today,
          searchQueries: { free: 0, paid: 0 },
          aiCalls: { gemini: 0, claude: 0 },
          costs: { search: 0, ai: 0, total: 0 },
          throttleEvents: [
            {
              timestamp: createTimestamp(now),
              reason,
            },
          ],
          createdAt: createTimestamp(now),
          updatedAt: createTimestamp(now),
        };
        transaction.set(docRef, newDoc);
      } else {
        // Append to existing
        const data = doc.data()!;
        const throttleEvents = data.throttleEvents || [];
        throttleEvents.push({
          timestamp: createTimestamp(now),
          reason,
        });

        transaction.update(docRef, {
          throttleEvents,
          updatedAt: createTimestamp(now),
        });
      }
    });
  }

  /**
   * Get budget history for date range
   */
  async getBudgetHistory(daysBack: number = 30): Promise<BudgetTrackingDoc[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const snapshot = await this.collection
      .where('date', '>=', startDateStr)
      .where('date', '<=', endDateStr)
      .orderBy('date', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.fromFirestore(doc));
  }

  /**
   * Get monthly totals
   */
  async getMonthlyTotals(year: number, month: number): Promise<{
    searchQueries: { free: number; paid: number };
    aiCalls: { gemini: number; claude: number };
    costs: { search: number; ai: number; total: number };
    throttleEventsCount: number;
  }> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    const snapshot = await this.collection
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    const totals = {
      searchQueries: { free: 0, paid: 0 },
      aiCalls: { gemini: 0, claude: 0 },
      costs: { search: 0, ai: 0, total: 0 },
      throttleEventsCount: 0,
    };

    for (const doc of snapshot.docs) {
      const data = this.fromFirestore(doc);
      totals.searchQueries.free += data.searchQueries.free;
      totals.searchQueries.paid += data.searchQueries.paid;
      totals.aiCalls.gemini += data.aiCalls.gemini;
      totals.aiCalls.claude += data.aiCalls.claude;
      totals.costs.search += data.costs.search;
      totals.costs.ai += data.costs.ai;
      totals.costs.total += data.costs.total;
      totals.throttleEventsCount += data.throttleEvents.length;
    }

    return totals;
  }

  /**
   * Delete old budget tracking data (cleanup)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const snapshot = await this.collection.where('date', '<', cutoffStr).limit(500).get();

    if (snapshot.empty) return 0;

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return snapshot.size;
  }
}

export const budgetTracking = new BudgetTrackingCollection();
