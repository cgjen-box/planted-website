// Mock sync data for testing

export const mockSyncPreview = {
  additions: [
    {
      id: 'venue-1',
      name: 'Tibits Zurich',
      venueName: 'Tibits Zurich',
      type: 'venue',
      dishCount: 2,
    },
    {
      id: 'venue-2',
      name: 'Hiltl',
      venueName: 'Hiltl',
      type: 'venue',
      dishCount: 1,
    },
  ],
  updates: [
    {
      id: 'venue-existing-1',
      name: 'Existing Restaurant',
      venueName: 'Existing Restaurant',
      type: 'venue',
      diff: ['address', 'dishes'],
      changeCount: 2,
    },
  ],
  removals: [
    {
      id: 'venue-old-1',
      name: 'Closed Restaurant',
      venueName: 'Closed Restaurant',
      type: 'venue',
      reason: 'No longer serves planted products',
    },
  ],
  totalChanges: 4,
};

export const mockSyncStats = {
  lastSync: '2024-12-09T14:30:00Z',
  pendingChanges: 4,
  totalSyncs: 150,
  successRate: 98,
  averageDuration: 5,
};

export const mockSyncHistory = [
  {
    id: 'sync-1',
    timestamp: '2024-12-09T14:30:00Z',
    type: 'full',
    status: 'completed',
    venues_synced: 15,
    dishes_synced: 45,
    errors: [],
    duration_ms: 5230,
    initiated_by: 'admin@example.com',
  },
  {
    id: 'sync-2',
    timestamp: '2024-12-08T10:00:00Z',
    type: 'partial',
    status: 'completed',
    venues_synced: 5,
    dishes_synced: 12,
    errors: [],
    duration_ms: 2100,
    initiated_by: 'admin@example.com',
  },
  {
    id: 'sync-3',
    timestamp: '2024-12-07T16:45:00Z',
    type: 'full',
    status: 'completed',
    venues_synced: 20,
    dishes_synced: 60,
    errors: [],
    duration_ms: 8500,
    initiated_by: 'admin@example.com',
  },
  {
    id: 'sync-4',
    timestamp: '2024-12-06T09:15:00Z',
    type: 'partial',
    status: 'failed',
    venues_synced: 0,
    dishes_synced: 0,
    errors: ['Database connection timeout'],
    duration_ms: 30000,
    initiated_by: 'admin@example.com',
  },
];

// Factory functions
export function createMockSyncPreview(overrides: Partial<typeof mockSyncPreview> = {}) {
  return {
    additions: [],
    updates: [],
    removals: [],
    totals: { additions: 0, updates: 0, removals: 0, total: 0 },
    ...overrides,
  };
}

export function createMockSyncHistoryEntry(overrides: Partial<typeof mockSyncHistory[0]> = {}) {
  return {
    id: `sync-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type: 'full' as const,
    status: 'completed' as const,
    venues_synced: 10,
    dishes_synced: 30,
    errors: [],
    duration_ms: 5000,
    initiated_by: 'test@example.com',
    ...overrides,
  };
}
