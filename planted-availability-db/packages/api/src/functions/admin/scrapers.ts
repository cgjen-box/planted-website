import { onRequest, HttpsOptions } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import {
  initializeFirestore,
  scraperRuns,
  discoveryRuns,
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
 * Available scraper types
 */
const AVAILABLE_SCRAPERS = [
  {
    id: 'discovery-all',
    name: 'Discovery Agent (All Countries)',
    description: 'Discovers new restaurants across all supported countries',
    type: 'discovery',
  },
  {
    id: 'discovery-de',
    name: 'Discovery Agent (Germany)',
    description: 'Discovers new restaurants in Germany',
    type: 'discovery',
  },
  {
    id: 'discovery-ch',
    name: 'Discovery Agent (Switzerland)',
    description: 'Discovers new restaurants in Switzerland',
    type: 'discovery',
  },
  {
    id: 'discovery-at',
    name: 'Discovery Agent (Austria)',
    description: 'Discovers new restaurants in Austria',
    type: 'discovery',
  },
  {
    id: 'dish-finder',
    name: 'Dish Finder',
    description: 'Finds Planted dishes at discovered venues',
    type: 'dish_extraction',
  },
  {
    id: 'freshness-check',
    name: 'Freshness Check',
    description: 'Re-verifies stale venue and dish data',
    type: 'verification',
  },
];

/**
 * Admin API for scraper control
 * Handles scraper triggering, stopping, and listing
 */
export const adminScrapersHandler = onRequest(functionOptions, async (req: Request, res: Response) => {
  await withAdminAuth(req, res, async (authReq, authRes) => {
    try {
      const pathParts = authReq.path.split('/').filter(Boolean);
      // Path structure: /scrapers, /scrapers/available, /scrapers/:id/trigger, /scrapers/:runId/stop

      const scraperId = pathParts.length >= 2 ? pathParts[1] : undefined;
      const action = pathParts.length >= 3 ? pathParts[2] : undefined;

      switch (authReq.method) {
        case 'GET': {
          // GET /scrapers/available - List available scrapers with last run times
          if (scraperId === 'available') {
            // Get recent runs for each scraper type
            const recentRuns = await scraperRuns.query({ limit: 100 });
            const discoveryRunsList = await discoveryRuns.query({ limit: 100 });

            // Build map of last run time per scraper
            const lastRunMap = new Map<string, any>();

            // Process scraper runs
            recentRuns.forEach(run => {
              if (!lastRunMap.has(run.scraper_id) ||
                  run.started_at > lastRunMap.get(run.scraper_id).started_at) {
                lastRunMap.set(run.scraper_id, run);
              }
            });

            // Process discovery runs (map to scraper IDs)
            discoveryRunsList.forEach(run => {
              const scraperId = run.country ? `discovery-${run.country.toLowerCase()}` : 'discovery-all';
              if (!lastRunMap.has(scraperId) ||
                  run.started_at > lastRunMap.get(scraperId).started_at) {
                lastRunMap.set(scraperId, {
                  id: run.id,
                  scraper_id: scraperId,
                  started_at: run.started_at,
                  completed_at: run.completed_at,
                  status: run.status,
                  stats: {
                    venues_checked: run.venues_discovered || 0,
                    venues_updated: run.venues_verified || 0,
                    dishes_found: 0,
                    dishes_updated: 0,
                    errors: 0,
                  },
                });
              }
            });

            // Enrich available scrapers with last run info
            const enrichedScrapers = AVAILABLE_SCRAPERS.map(scraper => ({
              ...scraper,
              last_run: lastRunMap.get(scraper.id) || null,
              can_trigger: true, // Could add logic to check if already running
            }));

            authRes.json({ scrapers: enrichedScrapers });
            return;
          }

          authRes.status(404).json({ error: 'Not found' });
          break;
        }

        case 'POST': {
          // POST /scrapers/:id/trigger - Trigger a scraper run manually
          if (action === 'trigger') {
            if (!scraperId) {
              authRes.status(400).json({ error: 'Scraper ID required' });
              return;
            }

            // Find the scraper
            const scraper = AVAILABLE_SCRAPERS.find(s => s.id === scraperId);
            if (!scraper) {
              authRes.status(404).json({ error: 'Scraper not found' });
              return;
            }

            // Check if scraper is already running
            const runningRuns = await scraperRuns.query({ status: 'running', limit: 50 });
            const alreadyRunning = runningRuns.some(r => r.scraper_id === scraperId);

            if (alreadyRunning) {
              authRes.status(409).json({
                error: 'Scraper already running',
                message: `${scraper.name} is already running. Please wait for it to complete.`,
              });
              return;
            }

            // Create a new scraper run
            const run = await scraperRuns.start(scraperId);

            authRes.status(200).json({
              success: true,
              message: `${scraper.name} triggered successfully`,
              run: {
                id: run.id,
                scraper_id: run.scraper_id,
                status: run.status,
                started_at: run.started_at,
              },
              note: 'Scraper has been queued. Actual execution depends on scraper service availability.',
            });
            return;
          }

          // POST /scrapers/:runId/stop - Stop a running scraper
          if (action === 'stop') {
            if (!scraperId) {
              authRes.status(400).json({ error: 'Run ID required' });
              return;
            }

            // Get the run
            const run = await scraperRuns.getById(scraperId); // scraperId is actually runId here

            if (!run) {
              authRes.status(404).json({ error: 'Run not found' });
              return;
            }

            if (run.status !== 'running') {
              authRes.status(400).json({
                error: 'Run is not running',
                message: `Run ${scraperId} has status: ${run.status}`,
              });
              return;
            }

            // Mark as stopped/failed
            await scraperRuns.complete(scraperId, 'failed', run.stats || {
              venues_checked: 0,
              venues_updated: 0,
              dishes_found: 0,
              dishes_updated: 0,
              errors: 0,
            }, [{ message: 'Manually stopped by admin', timestamp: new Date() }]);

            authRes.status(200).json({
              success: true,
              message: 'Scraper run stopped',
              run_id: scraperId,
              note: 'Run has been marked as stopped. The actual scraper process may take a moment to terminate.',
            });
            return;
          }

          authRes.status(400).json({ error: 'Invalid action' });
          break;
        }

        default:
          authRes.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('Admin scrapers error:', error);
      authRes.status(500).json({ error: 'Internal server error' });
    }
  });
});
