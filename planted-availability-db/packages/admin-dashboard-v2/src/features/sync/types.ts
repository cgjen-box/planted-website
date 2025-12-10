/**
 * Sync Feature Types
 *
 * Type definitions for the Sync to Website feature.
 */

/**
 * Sync Change Type
 */
export type SyncChangeType = 'addition' | 'update' | 'removal';

/**
 * Sync Status
 */
export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Sync Item Type
 */
export type SyncItemType = 'venue' | 'dish';

/**
 * Field Diff
 */
export interface FieldDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changed: boolean;
}

/**
 * Dish Diff
 */
export interface DishDiff {
  id: string;
  name: string;
  changeType: SyncChangeType;
  fields?: FieldDiff[];
}

/**
 * Sync Item
 */
export interface SyncItem {
  id: string;
  type: SyncItemType;
  changeType: SyncChangeType;
  venueId: string;
  venueName: string;
  dishId?: string;
  dishName?: string;
  data: unknown;
  diff?: FieldDiff[];
  dishDiffs?: DishDiff[];
  dishCount?: number; // For venue additions/updates
  priority: number;
  createdAt: string; // ISO date string
}

/**
 * Sync Preview Response
 */
export interface SyncPreview {
  additions: SyncItem[];
  updates: SyncItem[];
  removals: SyncItem[];
  totalChanges: number;
  estimatedDuration: number; // seconds
  lastSync?: string; // ISO date string
}

/**
 * Sync Request
 * Matches backend executeBodySchema in sync/execute.ts
 */
export interface SyncRequest {
  venueIds?: string[]; // IDs of venues to sync
  dishIds?: string[]; // IDs of dishes to sync
  syncAll?: boolean; // If true, sync all verified items
  dryRun?: boolean; // If true, only validate without executing
}

/**
 * Sync Progress Event
 */
export interface SyncProgressEvent {
  itemId: string;
  status: 'started' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  error?: string;
}

/**
 * Sync Result
 * Matches backend response from sync/execute.ts
 */
export interface SyncResult {
  success: boolean;
  message: string;
  synced: {
    venues: number;
    dishes: number;
  };
  errors?: Array<{
    entityId: string;
    entityType: 'venue' | 'dish';
    error: string;
  }>;
  stats: {
    requested: {
      venues: number;
      dishes: number;
    };
    successful: {
      venues: number;
      dishes: number;
    };
    failed: {
      venues: number;
      dishes: number;
    };
  };
}

/**
 * Sync History Entry
 */
export interface SyncHistoryEntry {
  id: string;
  status: SyncStatus;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  duration: number; // seconds
  startedAt: string; // ISO date string
  completedAt?: string; // ISO date string
  startedBy: string;
  errors?: Array<{
    itemId: string;
    error: string;
  }>;
}

/**
 * Sync History Response
 */
export interface SyncHistoryResponse {
  entries: SyncHistoryEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Sync Stats
 */
export interface SyncStats {
  lastSync?: string; // ISO date string
  nextScheduledSync?: string; // ISO date string
  pendingChanges: number;
  totalSyncs: number;
  successRate: number; // 0-100
  averageDuration: number; // seconds
}

/**
 * Change Type Labels
 */
export const CHANGE_TYPE_LABELS: Record<SyncChangeType, string> = {
  addition: 'Addition',
  update: 'Update',
  removal: 'Removal',
};

/**
 * Change Type Emojis
 */
export const CHANGE_TYPE_EMOJIS: Record<SyncChangeType, string> = {
  addition: '+',
  update: '~',
  removal: '-',
};

/**
 * Change Type Colors
 */
export const CHANGE_TYPE_COLORS: Record<SyncChangeType, string> = {
  addition: 'success',
  update: 'warning',
  removal: 'destructive',
};

/**
 * Sync Status Labels
 */
export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
};

/**
 * Sync Status Emojis
 */
export const SYNC_STATUS_EMOJIS: Record<SyncStatus, string> = {
  pending: '⏳',
  in_progress: '🔄',
  completed: '✅',
  failed: '❌',
};
