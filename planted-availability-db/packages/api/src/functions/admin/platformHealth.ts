import { onRequest, HttpsOptions } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import { initializeFirestore, getFirestore } from '@pad/database';
import { verifyAuth, requireAdmin, type AuthenticatedRequest } from '../../middleware/auth.js';

// Initialize Firestore
initializeFirestore();

const functionOptions: HttpsOptions = {
  region: 'europe-west6',
  cors: true,
  invoker: 'public',
};

/**
 * Helper to wrap admin handlers with authentication
 */
async function withAdminAuth(
  req: Request,
  res: Response,
  handler: (req: AuthenticatedRequest, res: Response) => Promise<void>
): Promise<void> {
  let authPassed = false;
  const mockNext = () => { authPassed = true; };

  await verifyAuth(req as AuthenticatedRequest, res, mockNext);
  if (!authPassed) return;

  authPassed = false;
  await requireAdmin(req as AuthenticatedRequest, res, mockNext);
  if (!authPassed) return;

  await handler(req as AuthenticatedRequest, res);
}

/**
 * GET /admin/platform-health
 * Returns platform health metrics from the platform_health collection
 * Requires admin authentication
 */
export const adminPlatformHealthHandler = onRequest(functionOptions, async (req: Request, res: Response) => {
  await withAdminAuth(req, res, async (authReq, authRes) => {
    if (authReq.method !== 'GET') {
      authRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const db = getFirestore();
      const snapshot = await db.collection('platform_health').get();

      const platformHealth = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          platform: doc.id,
          last_check: data.last_check?.toDate?.() || data.last_check,
          is_available: data.is_available ?? true,
          success_rate_1h: data.success_rate_1h || 0,
          success_rate_24h: data.success_rate_24h || 0,
          avg_response_time_ms: data.avg_response_time_ms || 0,
          last_error: data.last_error,
          last_error_time: data.last_error_time?.toDate?.() || data.last_error_time,
          consecutive_failures: data.consecutive_failures || 0,
          requests_1h: data.requests_1h || 0,
          requests_24h: data.requests_24h || 0,
          updated_at: data.updated_at?.toDate?.() || data.updated_at,
        };
      });

      // Calculate summary stats
      const totalPlatforms = platformHealth.length;
      const healthyPlatforms = platformHealth.filter(p => p.is_available).length;
      const avgSuccessRate = platformHealth.length > 0
        ? platformHealth.reduce((sum, p) => sum + p.success_rate_24h, 0) / platformHealth.length
        : 0;

      authRes.set('Cache-Control', 'private, max-age=30'); // 30 second cache

      authRes.status(200).json({
        platforms: platformHealth,
        summary: {
          total: totalPlatforms,
          healthy: healthyPlatforms,
          degraded: totalPlatforms - healthyPlatforms,
          avg_success_rate_24h: Math.round(avgSuccessRate * 100) / 100,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Admin platform health API error:', errorMessage);
      authRes.status(500).json({
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  });
});

/**
 * GET /admin/circuit-breakers
 * Returns current circuit breaker states
 * Requires admin authentication
 *
 * Note: Circuit breakers are in-memory in the scrapers package.
 * This endpoint would need to be implemented in the scrapers service itself
 * or store circuit breaker states in Firestore for monitoring.
 * For now, we return a placeholder response.
 */
export const adminCircuitBreakersHandler = onRequest(functionOptions, async (req: Request, res: Response) => {
  await withAdminAuth(req, res, async (authReq, authRes) => {
    if (authReq.method !== 'GET') {
      authRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const db = getFirestore();

      // Try to get circuit breaker states from Firestore (if they're being persisted)
      // This is a placeholder - actual implementation would depend on whether
      // circuit breakers are persisting their state
      const snapshot = await db.collection('circuit_breakers').get();

      const circuitBreakers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          name: doc.id,
          state: data.state || 'CLOSED',
          failures: data.failures || 0,
          successes: data.successes || 0,
          total_requests: data.total_requests || 0,
          failure_rate: data.failure_rate || 0,
          consecutive_failures: data.consecutive_failures || 0,
          last_failure_time: data.last_failure_time?.toDate?.() || data.last_failure_time,
          last_success_time: data.last_success_time?.toDate?.() || data.last_success_time,
          next_attempt_time: data.next_attempt_time?.toDate?.() || data.next_attempt_time,
          updated_at: data.updated_at?.toDate?.() || data.updated_at,
        };
      });

      // If no circuit breakers are persisted, return empty array with note
      authRes.set('Cache-Control', 'private, max-age=30'); // 30 second cache

      authRes.status(200).json({
        circuit_breakers: circuitBreakers,
        note: circuitBreakers.length === 0
          ? 'Circuit breakers are in-memory and not currently persisted. Consider implementing state persistence for monitoring.'
          : undefined,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Admin circuit breakers API error:', errorMessage);
      authRes.status(500).json({
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  });
});
