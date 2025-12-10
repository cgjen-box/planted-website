// Mock scraping/budget data for testing

export const mockBudgetStatus = {
  daily: {
    limit: 100,
    used: 45,
    percentage: 45,
  },
  monthly: {
    limit: 2000,
    used: 850,
    percentage: 42.5,
  },
  breakdown: {
    search: {
      free: {
        limit: 1000,
        used: 450,
      },
      paid: {
        cost: 12.5,
        count: 25,
      },
    },
    ai: {
      cost: 32.5,
      calls: 650,
    },
  },
  throttled: false,
  throttleReason: null,
};

export const mockStrategyStats = {
  total_strategies: 150,
  active_strategies: 120,
  deprecated_strategies: 30,
  average_success_rate: 67,
  total_uses: 5000,
  total_discoveries: 3350,
  total_false_positives: 450,
  recently_used_count: 45,
  tiers: {
    high: 25,    // 70%+ success rate
    medium: 60,  // 40-69% success rate
    low: 35,     // <40% success rate
    untested: 0,
  },
  by_origin: {
    seed: 20,
    evolved: 45,
    manual: 15,
    agent: 40,
  },
  by_platform: {
    uber_eats: 50,
    wolt: 35,
    deliveroo: 25,
    just_eat: 20,
    lieferando: 20,
  },
  by_country: {
    CH: 40,
    DE: 60,
    AT: 20,
    UK: 15,
    FR: 10,
    NL: 5,
  },
  top_strategies: [
    {
      id: 'strategy-1',
      query_template: 'Planted Chicken UberEats CH',
      success_rate: 92,
      total_uses: 150,
      successful_discoveries: 138,
      false_positives: 5,
      platform: 'uber_eats',
      country: 'CH',
      origin: 'seed',
    },
    {
      id: 'strategy-2',
      query_template: 'Kebab Search Wolt DE',
      success_rate: 88,
      total_uses: 120,
      successful_discoveries: 106,
      false_positives: 8,
      platform: 'wolt',
      country: 'DE',
      origin: 'evolved',
    },
    {
      id: 'strategy-3',
      query_template: 'Schnitzel Deliveroo AT',
      success_rate: 85,
      total_uses: 80,
      successful_discoveries: 68,
      false_positives: 6,
      platform: 'deliveroo',
      country: 'AT',
      origin: 'agent',
    },
    {
      id: 'strategy-4',
      query_template: 'Burger Chain Discovery',
      success_rate: 82,
      total_uses: 200,
      successful_discoveries: 164,
      false_positives: 20,
      platform: 'uber_eats',
      country: 'DE',
      origin: 'manual',
    },
    {
      id: 'strategy-5',
      query_template: 'Pulled Pork Alternative',
      success_rate: 78,
      total_uses: 90,
      successful_discoveries: 70,
      false_positives: 10,
      platform: 'wolt',
      country: 'CH',
      origin: 'evolved',
    },
  ],
  struggling_strategies: [
    {
      id: 'strategy-low-1',
      query_template: 'Generic Vegan Search',
      success_rate: 25,
      total_uses: 100,
      successful_discoveries: 25,
      false_positives: 45,
      platform: 'just_eat',
      country: 'UK',
      origin: 'seed',
    },
    {
      id: 'strategy-low-2',
      query_template: 'Plant-Based Broad',
      success_rate: 30,
      total_uses: 80,
      successful_discoveries: 24,
      false_positives: 35,
      platform: 'uber_eats',
      country: 'FR',
      origin: 'agent',
    },
    {
      id: 'strategy-low-3',
      query_template: 'Meat Alternative Generic',
      success_rate: 35,
      total_uses: 60,
      successful_discoveries: 21,
      false_positives: 25,
      platform: 'deliveroo',
      country: 'NL',
      origin: 'evolved',
    },
  ],
};

export const mockScraperRuns = [
  {
    id: 'run-1',
    type: 'discovery',
    status: 'completed',
    started_at: '2024-12-10T08:00:00Z',
    completed_at: '2024-12-10T08:45:00Z',
    config: {
      countries: ['CH'],
      platforms: ['uber_eats', 'wolt'],
      mode: 'explore',
    },
    results: {
      queries_executed: 45,
      venues_found: 12,
      cost: 0.45,
    },
  },
  {
    id: 'run-2',
    type: 'extraction',
    status: 'running',
    started_at: '2024-12-10T09:30:00Z',
    completed_at: null,
    config: {
      mode: 'enrich',
      venue_ids: ['venue-1', 'venue-2'],
    },
    results: null,
    progress: {
      current: 1,
      total: 2,
      percentage: 50,
    },
  },
];

// Factory functions
export function createMockBudgetStatus(overrides: Partial<typeof mockBudgetStatus> = {}) {
  return {
    daily: { limit: 100, used: 0, remaining: 100, percentage: 0 },
    monthly: { limit: 2000, used: 0, remaining: 2000, percentage: 0 },
    breakdown: { search_free: 0, search_paid: 0, ai_calls: 0 },
    throttle: { active: false, reason: null, until: null },
    last_updated: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockStrategy(overrides: Partial<typeof mockStrategyStats.top_strategies[0]> = {}) {
  return {
    id: `strategy-${Math.random().toString(36).substr(2, 9)}`,
    query_template: 'Test Strategy',
    success_rate: 75,
    total_uses: 50,
    successful_discoveries: 38,
    false_positives: 5,
    platform: 'uber_eats',
    country: 'CH',
    origin: 'seed' as const,
    ...overrides,
  };
}
