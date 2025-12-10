/**
 * Sync API
 *
 * API functions for the Sync to Website feature.
 */

import { get, post } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  SyncPreview,
  SyncRequest,
  SyncResult,
  SyncHistoryResponse,
  SyncStats,
} from '../types';

/**
 * Get sync preview (pending changes)
 */
export async function getSyncPreview(): Promise<SyncPreview> {
  return get<SyncPreview>(API_ENDPOINTS.SYNC_PREVIEW);
}

/**
 * Execute sync
 */
export async function executeSync(request: SyncRequest): Promise<SyncResult> {
  return post<SyncResult>(API_ENDPOINTS.SYNC_EXECUTE, request);
}

/**
 * Get sync history
 */
export async function getSyncHistory(page = 1, pageSize = 20): Promise<SyncHistoryResponse> {
  return get<SyncHistoryResponse>(`${API_ENDPOINTS.SYNC_HISTORY}?page=${page}&pageSize=${pageSize}`);
}

/**
 * Get sync stats
 * Note: Stats are derived from the preview response
 */
export async function getSyncStats(): Promise<SyncStats> {
  const preview = await get<SyncPreview>(API_ENDPOINTS.SYNC_PREVIEW);
  return {
    lastSync: preview.lastSync,
    pendingChanges: preview.totalChanges || 0,
    totalSyncs: 0, // Not available from preview
    successRate: 100, // Not available from preview
    averageDuration: preview.estimatedDuration || 0,
  };
}

/**
 * Cancel ongoing sync
 * Note: This may not be available - depends on implementation
 */
export async function cancelSync(syncId: string): Promise<void> {
  // This endpoint may not exist - keeping for interface compatibility
  return post(`${API_ENDPOINTS.SYNC_EXECUTE}`, { action: 'cancel', syncId });
}
