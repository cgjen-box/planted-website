import { http, HttpResponse } from 'msw';
import { mockBudgetStatus, mockStrategyStats } from '../data/scraping';

const API_BASE = 'https://us-central1-get-planted-db.cloudfunctions.net';

export const scrapingHandlers = [
  // Get budget status
  http.get(`${API_BASE}/adminBudgetStatus`, () => {
    return HttpResponse.json(mockBudgetStatus);
  }),

  // Get strategy stats
  http.get(`${API_BASE}/adminStrategyStats`, () => {
    return HttpResponse.json({
      success: true,
      stats: mockStrategyStats,
      top_strategies: mockStrategyStats.top_strategies,
      struggling_strategies: mockStrategyStats.struggling_strategies,
    });
  }),

  // Get available scrapers
  http.get(`${API_BASE}/adminAvailableScrapers`, () => {
    return HttpResponse.json({
      success: true,
      discovery: {
        countries: ['CH', 'DE', 'AT'],
        platforms: ['uber_eats', 'wolt', 'deliveroo'],
        modes: ['explore', 'enumerate', 'verify'],
      },
      extraction: {
        modes: ['enrich', 'refresh', 'verify'],
      },
      recent_runs: [],
      running: [],
    });
  }),

  // Start discovery scraper
  http.post(`${API_BASE}/adminStartDiscovery`, async ({ request }) => {
    const body = await request.json() as { countries: string[]; mode: string };
    return HttpResponse.json({
      success: true,
      message: 'Discovery started',
      run_id: `run-${Date.now()}`,
      estimated_cost: 0.5,
    });
  }),

  // Start extraction scraper
  http.post(`${API_BASE}/adminStartExtraction`, async () => {
    return HttpResponse.json({
      success: true,
      message: 'Extraction started',
      run_id: `run-${Date.now()}`,
    });
  }),

  // Cancel scraper
  http.post(`${API_BASE}/adminCancelScraper`, async ({ request }) => {
    const body = await request.json() as { runId: string };
    return HttpResponse.json({
      success: true,
      message: `Scraper ${body.runId} cancelled`,
    });
  }),

  // Get scraper status
  http.get(`${API_BASE}/adminScraperStatus`, () => {
    return HttpResponse.json({
      success: true,
      runs: [],
      summary: {
        running: 0,
        completed_24h: 5,
        failed_24h: 0,
      },
    });
  }),

  // Get analytics KPIs
  http.get(`${API_BASE}/adminAnalyticsKpis`, () => {
    return HttpResponse.json({
      success: true,
      kpis: {
        discovery_rate: 45,
        approval_rate: 78,
        accuracy: 92,
        total_venues: 150,
        total_dishes: 450,
      },
    });
  }),
];
