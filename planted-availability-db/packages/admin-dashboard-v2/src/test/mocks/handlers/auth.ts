import { http, HttpResponse } from 'msw';

// Auth handlers for Firebase auth mocking
// Note: Firebase auth is handled differently (via firebase SDK mock)
// These are placeholder handlers for any custom auth endpoints

export const authHandlers = [
  // Health check
  http.get('https://us-central1-get-planted-db.cloudfunctions.net/adminHealthCheck', () => {
    return HttpResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }),

  // Get admin metrics (for dashboard)
  http.get('https://us-central1-get-planted-db.cloudfunctions.net/adminMetrics', () => {
    return HttpResponse.json({
      success: true,
      metrics: {
        pending_count: 25,
        verified_count: 120,
        rejected_count: 15,
        total_count: 160,
        by_platform: {
          uber_eats: 80,
          wolt: 50,
          deliveroo: 30,
        },
        by_country: {
          CH: 60,
          DE: 70,
          AT: 30,
        },
      },
    });
  }),
];
