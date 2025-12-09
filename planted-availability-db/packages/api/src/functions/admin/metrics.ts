import { onRequest, HttpsOptions } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import {
  initializeFirestore,
  discoveredVenues,
  discoveryRuns,
  scraperRuns,
} from '@pad/database';
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
 * GET /admin/metrics
 * Returns real-time dashboard metrics
 * Requires admin authentication
 */
export const adminMetricsHandler = onRequest(functionOptions, async (req: Request, res: Response) => {
  await withAdminAuth(req, res, async (authReq, authRes) => {
    if (authReq.method !== 'GET') {
      authRes.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      // Get discovered venue stats
      const stats = await discoveredVenues.getStats();

      // Get venues discovered today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allDiscovered = await discoveredVenues.getByStatus('discovered');
      const discoveredToday = allDiscovered.filter(v => v.created_at >= today);

      // Get venues verified today
      const allVerified = await discoveredVenues.getByStatus('verified');
      const verifiedToday = allVerified.filter(v =>
        v.verified_at && v.verified_at >= today
      );

      // Get venues rejected today
      const allRejected = await discoveredVenues.getByStatus('rejected');
      const rejectedToday = allRejected.filter(v =>
        v.updated_at && v.updated_at >= today && v.status === 'rejected'
      );

      // Get pending count (venues with 'discovered' status)
      const pendingCount = stats.by_status.discovered || 0;

      // Calculate confidence distribution for pending venues
      const pendingVenues = await discoveredVenues.getByStatus('discovered');
      const byConfidence = {
        low: pendingVenues.filter(v => v.confidence_score < 40).length,
        medium: pendingVenues.filter(v => v.confidence_score >= 40 && v.confidence_score < 70).length,
        high: pendingVenues.filter(v => v.confidence_score >= 70).length,
      };

      // Get platform stats from pending venues
      const platformCounts: Record<string, number> = {};
      pendingVenues.forEach(venue => {
        venue.delivery_platforms.forEach(platform => {
          platformCounts[platform.platform] = (platformCounts[platform.platform] || 0) + 1;
        });
      });

      // Get recent discovery run stats
      const recentRuns = await discoveryRuns.query({ limit: 10 });
      const runningRuns = recentRuns.filter(r => r.status === 'running');

      // Get scraper runs for last 24h
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentScraperRuns = await scraperRuns.query({
        fromDate: last24h,
        limit: 100
      });

      authRes.set('Cache-Control', 'private, max-age=30'); // 30 second cache

      authRes.status(200).json({
        pending_discovered_venues: pendingCount,
        verified_today: verifiedToday.length,
        rejected_today: rejectedToday.length,
        discovered_today: discoveredToday.length,
        total_verified: stats.by_status.verified || 0,
        total_rejected: stats.by_status.rejected || 0,
        by_platform: platformCounts,
        by_country: stats.by_country || {},
        by_confidence: byConfidence,
        discovery_runs: {
          running: runningRuns.length,
          last_24h: recentScraperRuns.length,
          last_run: recentRuns[0] || null,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Admin metrics API error:', errorMessage);
      authRes.status(500).json({
        error: 'Internal server error',
        message: errorMessage,
      });
    }
  });
});
