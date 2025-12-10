import { http, HttpResponse } from 'msw';
import { mockSyncPreview, mockSyncStats, mockSyncHistory } from '../data/sync';

const API_BASE = 'https://us-central1-get-planted-db.cloudfunctions.net';

export const syncHandlers = [
  // Get sync preview - returns backend format with nested structure
  http.get(`${API_BASE}/adminSyncPreview`, () => {
    return HttpResponse.json({
      additions: {
        venues: mockSyncPreview.additions.filter(item => item.type === 'venue').map(v => ({
          id: v.id,
          name: v.venueName || v.name,
          dishes: [],
        })),
        dishes: [],
      },
      updates: {
        venues: mockSyncPreview.updates.filter(item => item.type === 'venue').map(v => ({
          id: v.id,
          name: v.venueName || v.name,
          diff: v.diff,
        })),
        dishes: [],
      },
      removals: {
        venues: mockSyncPreview.removals.filter(item => item.type === 'venue').map(v => ({
          id: v.id,
          name: v.venueName || v.name,
        })),
        dishes: [],
      },
      stats: {
        total: mockSyncPreview.totalChanges || mockSyncPreview.additions.length + mockSyncPreview.updates.length + mockSyncPreview.removals.length,
        additions: mockSyncPreview.additions.length,
        updates: mockSyncPreview.updates.length,
        removals: mockSyncPreview.removals.length,
      },
    });
  }),

  // Execute sync
  http.post(`${API_BASE}/adminSyncExecute`, async ({ request }) => {
    const body = await request.json() as { itemIds?: string[]; dryRun?: boolean };
    const itemCount = body.itemIds?.length || 0;
    return HttpResponse.json({
      success: true,
      itemsProcessed: itemCount,
      itemsSucceeded: itemCount,
      itemsFailed: 0,
      errors: [],
    });
  }),

  // Cancel sync
  http.post(`${API_BASE}/adminCancelSync`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Sync cancelled',
    });
  }),

  // Get sync history
  http.get(`${API_BASE}/adminSyncHistory`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
    const offset = (page - 1) * pageSize;

    return HttpResponse.json({
      success: true,
      items: mockSyncHistory.slice(offset, offset + pageSize),
      total: mockSyncHistory.length,
      page,
      pageSize,
      totalPages: Math.ceil(mockSyncHistory.length / pageSize),
    });
  }),
];
