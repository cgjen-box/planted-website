/**
 * Dead Letter Queue (DLQ) Service
 *
 * Manages failed operations in the scrapers package with automatic retry scheduling.
 * Implements exponential backoff and escalation to manual review after max retries.
 *
 * Features:
 * - Store failed operations in Firestore
 * - Exponential backoff retry scheduling
 * - Query and filter failed operations
 * - Manual retry and resolution
 * - Escalation to manual review
 *
 * Retry Schedule (Exponential Backoff):
 * - Attempt 1: immediate (0 delay)
 * - Attempt 2: 5 min delay
 * - Attempt 3: 30 min delay
 * - Attempt 4: 2 hour delay
 * - Attempt 5: 6 hours delay
 * - After 5 attempts: mark as requires_manual
 *
 * Based on FUTURE-IMPROVEMENTS.md Section 6.1C
 */

import { getFirestore, Timestamp } from '@pad/database';
import type { Firestore } from 'firebase-admin/firestore';

// ============================================================================
// Types
// ============================================================================

export type OperationType =
  | 'discovery'
  | 'dish_extraction'
  | 'venue_verification'
  | 'menu_scrape';

export type OperationStatus = 'pending_retry' | 'requires_manual' | 'resolved';

export interface FailedOperation {
  id: string;
  type: OperationType;
  venue_id?: string;
  platform?: string;
  error: string;
  stack?: string;
  attempts: number;
  max_attempts: number;
  created_at: Date;
  last_attempt_at: Date;
  next_retry_at?: Date;
  status: OperationStatus;
  context?: Record<string, unknown>; // Original operation context for retry
}

export interface FailedOperationFilters {
  status?: OperationStatus;
  type?: OperationType;
  platform?: string;
  venue_id?: string;
  before_date?: Date;
  after_date?: Date;
  limit?: number;
}

export interface DLQStats {
  total_failed: number;
  pending_retry: number;
  requires_manual: number;
  resolved: number;
  by_type: Record<OperationType, number>;
  by_platform: Record<string, number>;
}

// ============================================================================
// Constants
// ============================================================================

const COLLECTION_NAME = 'failed_operations';
const MAX_ATTEMPTS = 5;

// Exponential backoff delays in milliseconds
const RETRY_DELAYS_MS = [
  0, // Attempt 1: immediate
  5 * 60 * 1000, // Attempt 2: 5 minutes
  30 * 60 * 1000, // Attempt 3: 30 minutes
  2 * 60 * 60 * 1000, // Attempt 4: 2 hours
  6 * 60 * 60 * 1000, // Attempt 5: 6 hours
];

// ============================================================================
// Dead Letter Queue Service
// ============================================================================

export class DeadLetterQueue {
  private db: Firestore;

  constructor() {
    this.db = getFirestore();
  }

  /**
   * Add a failed operation to the DLQ
   */
  async queueFailedOperation(
    operation: Omit<FailedOperation, 'id' | 'created_at' | 'last_attempt_at' | 'next_retry_at'>
  ): Promise<string> {
    const now = new Date();
    const attempts = operation.attempts || 0;

    // Calculate next retry time based on attempts
    const nextRetryAt = this.calculateNextRetryTime(attempts);

    // Determine status
    let status: OperationStatus = 'pending_retry';
    if (attempts >= operation.max_attempts) {
      status = 'requires_manual';
    }

    const docData = {
      type: operation.type,
      venue_id: operation.venue_id || null,
      platform: operation.platform || null,
      error: operation.error,
      stack: operation.stack || null,
      attempts,
      max_attempts: operation.max_attempts,
      created_at: Timestamp.fromDate(now),
      last_attempt_at: Timestamp.fromDate(now),
      next_retry_at: nextRetryAt ? Timestamp.fromDate(nextRetryAt) : null,
      status,
      context: operation.context || null,
    };

    const docRef = await this.db.collection(COLLECTION_NAME).add(docData);

    console.log(
      `[DLQ] Queued failed operation: ${operation.type} (attempts: ${attempts}/${operation.max_attempts}, status: ${status})`
    );

    return docRef.id;
  }

  /**
   * Get failed operations based on filters
   */
  async getFailedOperations(filters: FailedOperationFilters = {}): Promise<FailedOperation[]> {
    let query = this.db.collection(COLLECTION_NAME).orderBy('created_at', 'desc');

    // Apply filters
    if (filters.status) {
      query = query.where('status', '==', filters.status) as any;
    }

    if (filters.type) {
      query = query.where('type', '==', filters.type) as any;
    }

    if (filters.platform) {
      query = query.where('platform', '==', filters.platform) as any;
    }

    if (filters.venue_id) {
      query = query.where('venue_id', '==', filters.venue_id) as any;
    }

    if (filters.after_date) {
      query = query.where('created_at', '>=', Timestamp.fromDate(filters.after_date)) as any;
    }

    if (filters.before_date) {
      query = query.where('created_at', '<=', Timestamp.fromDate(filters.before_date)) as any;
    }

    if (filters.limit) {
      query = query.limit(filters.limit) as any;
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => this.docToFailedOperation(doc));
  }

  /**
   * Get operations that are due for retry
   */
  async getRetryableOperations(): Promise<FailedOperation[]> {
    const now = new Date();

    const snapshot = await this.db
      .collection(COLLECTION_NAME)
      .where('status', '==', 'pending_retry')
      .where('next_retry_at', '<=', Timestamp.fromDate(now))
      .where('attempts', '<', MAX_ATTEMPTS)
      .orderBy('next_retry_at', 'asc')
      .limit(50) // Process in batches
      .get();

    return snapshot.docs.map((doc) => this.docToFailedOperation(doc));
  }

  /**
   * Manually trigger a retry for a specific operation
   */
  async retryOperation(id: string): Promise<void> {
    const docRef = this.db.collection(COLLECTION_NAME).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error(`Failed operation not found: ${id}`);
    }

    const data = doc.data()!;
    const newAttempts = data.attempts + 1;
    const nextRetryAt = this.calculateNextRetryTime(newAttempts);

    let status: OperationStatus = 'pending_retry';
    if (newAttempts >= data.max_attempts) {
      status = 'requires_manual';
    }

    await docRef.update({
      attempts: newAttempts,
      last_attempt_at: Timestamp.fromDate(new Date()),
      next_retry_at: nextRetryAt ? Timestamp.fromDate(nextRetryAt) : null,
      status,
    });

    console.log(
      `[DLQ] Retry scheduled for operation ${id}: attempt ${newAttempts}/${data.max_attempts}`
    );
  }

  /**
   * Mark an operation as resolved
   */
  async markResolved(id: string): Promise<void> {
    const docRef = this.db.collection(COLLECTION_NAME).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error(`Failed operation not found: ${id}`);
    }

    await docRef.update({
      status: 'resolved',
      next_retry_at: null,
    });

    console.log(`[DLQ] Operation ${id} marked as resolved`);
  }

  /**
   * Mark an operation as requiring manual intervention
   */
  async markRequiresManual(id: string, reason?: string): Promise<void> {
    const docRef = this.db.collection(COLLECTION_NAME).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new Error(`Failed operation not found: ${id}`);
    }

    const updateData: any = {
      status: 'requires_manual',
      next_retry_at: null,
    };

    if (reason) {
      updateData.manual_review_reason = reason;
    }

    await docRef.update(updateData);

    console.log(`[DLQ] Operation ${id} escalated to manual review${reason ? `: ${reason}` : ''}`);
  }

  /**
   * Get DLQ statistics
   */
  async getStats(): Promise<DLQStats> {
    const snapshot = await this.db.collection(COLLECTION_NAME).get();

    const stats: DLQStats = {
      total_failed: snapshot.size,
      pending_retry: 0,
      requires_manual: 0,
      resolved: 0,
      by_type: {} as Record<OperationType, number>,
      by_platform: {} as Record<string, number>,
    };

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Count by status
      if (data.status === 'pending_retry') {
        stats.pending_retry++;
      } else if (data.status === 'requires_manual') {
        stats.requires_manual++;
      } else if (data.status === 'resolved') {
        stats.resolved++;
      }

      // Count by type
      const type = data.type as OperationType;
      stats.by_type[type] = (stats.by_type[type] || 0) + 1;

      // Count by platform
      if (data.platform) {
        stats.by_platform[data.platform] = (stats.by_platform[data.platform] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Delete a failed operation (use carefully)
   */
  async deleteOperation(id: string): Promise<void> {
    await this.db.collection(COLLECTION_NAME).doc(id).delete();
    console.log(`[DLQ] Operation ${id} deleted from queue`);
  }

  /**
   * Clean up old resolved operations (e.g., older than 30 days)
   */
  async cleanupResolved(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const snapshot = await this.db
      .collection(COLLECTION_NAME)
      .where('status', '==', 'resolved')
      .where('created_at', '<=', Timestamp.fromDate(cutoffDate))
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`[DLQ] Cleaned up ${snapshot.size} resolved operations older than ${olderThanDays} days`);
    return snapshot.size;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Calculate next retry time based on attempt number
   */
  private calculateNextRetryTime(attempts: number): Date | null {
    if (attempts >= MAX_ATTEMPTS) {
      return null; // No more retries
    }

    const delayMs = RETRY_DELAYS_MS[attempts] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    const nextRetry = new Date();
    nextRetry.setTime(nextRetry.getTime() + delayMs);
    return nextRetry;
  }

  /**
   * Convert Firestore document to FailedOperation
   */
  private docToFailedOperation(doc: FirebaseFirestore.QueryDocumentSnapshot): FailedOperation {
    const data = doc.data();

    return {
      id: doc.id,
      type: data.type,
      venue_id: data.venue_id || undefined,
      platform: data.platform || undefined,
      error: data.error,
      stack: data.stack || undefined,
      attempts: data.attempts,
      max_attempts: data.max_attempts,
      created_at: data.created_at.toDate(),
      last_attempt_at: data.last_attempt_at.toDate(),
      next_retry_at: data.next_retry_at ? data.next_retry_at.toDate() : undefined,
      status: data.status,
      context: data.context || undefined,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let dlqInstance: DeadLetterQueue | null = null;

/**
 * Get the singleton DLQ instance
 */
export function getDeadLetterQueue(): DeadLetterQueue {
  if (!dlqInstance) {
    dlqInstance = new DeadLetterQueue();
  }
  return dlqInstance;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Queue a failed operation with default max_attempts
 */
export async function queueFailedOperation(
  operation: Omit<FailedOperation, 'id' | 'created_at' | 'last_attempt_at' | 'next_retry_at' | 'max_attempts'> & {
    max_attempts?: number;
  }
): Promise<string> {
  const dlq = getDeadLetterQueue();
  return dlq.queueFailedOperation({
    ...operation,
    max_attempts: operation.max_attempts || MAX_ATTEMPTS,
  });
}

/**
 * Get all failed operations (convenience wrapper)
 */
export async function getFailedOperations(
  filters?: FailedOperationFilters
): Promise<FailedOperation[]> {
  const dlq = getDeadLetterQueue();
  return dlq.getFailedOperations(filters);
}

/**
 * Get operations ready for retry
 */
export async function getRetryableOperations(): Promise<FailedOperation[]> {
  const dlq = getDeadLetterQueue();
  return dlq.getRetryableOperations();
}

/**
 * Retry a specific operation
 */
export async function retryOperation(id: string): Promise<void> {
  const dlq = getDeadLetterQueue();
  return dlq.retryOperation(id);
}

/**
 * Mark operation as resolved
 */
export async function markResolved(id: string): Promise<void> {
  const dlq = getDeadLetterQueue();
  return dlq.markResolved(id);
}

/**
 * Mark operation as requiring manual intervention
 */
export async function markRequiresManual(id: string, reason?: string): Promise<void> {
  const dlq = getDeadLetterQueue();
  return dlq.markRequiresManual(id, reason);
}

/**
 * Get DLQ statistics
 */
export async function getDLQStats(): Promise<DLQStats> {
  const dlq = getDeadLetterQueue();
  return dlq.getStats();
}

/**
 * Clean up old resolved operations
 */
export async function cleanupResolvedOperations(olderThanDays?: number): Promise<number> {
  const dlq = getDeadLetterQueue();
  return dlq.cleanupResolved(olderThanDays);
}
