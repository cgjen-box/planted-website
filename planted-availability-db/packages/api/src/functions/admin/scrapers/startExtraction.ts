/**
 * POST /admin/scrapers/extraction/start
 * Start an extraction scraper run
 * Requires admin authentication
 */

import { initializeFirestore, scraperRuns } from '@pad/database';
import { createAdminHandler } from '../../../middleware/adminHandler.js';
import { shouldThrottle, estimateScraperCost } from '../../../services/budgetThrottle.js';
import { z } from 'zod';

// Initialize Firestore
initializeFirestore();

// Validation schema
const startExtractionSchema = z.object({
  target: z.enum(['all', 'chain', 'venue']),
  chainId: z.string().optional(),
  venueId: z.string().optional(),
  maxVenues: z.number().int().positive().optional().default(50),
  mode: z.enum(['enrich', 'refresh', 'verify']),
});

type StartExtractionRequest = z.infer<typeof startExtractionSchema>;

/**
 * Handler for POST /admin/scrapers/extraction/start
 */
export const adminStartExtractionHandler = createAdminHandler(
  async (req, res) => {
    // Validate request body
    const validation = startExtractionSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: validation.error.issues,
      });
      return;
    }

    const body: StartExtractionRequest = validation.data;

    // Validate target-specific requirements
    if (body.target === 'chain' && !body.chainId) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'chainId is required when target is "chain"',
      });
      return;
    }

    if (body.target === 'venue' && !body.venueId) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'venueId is required when target is "venue"',
      });
      return;
    }

    // Estimate costs
    const estimatedVenues = body.target === 'venue' ? 1 : body.maxVenues;
    const estimatedAICalls = estimatedVenues * 5; // Rough estimate: 5 AI calls per venue
    const estimatedSearchQueries = 0; // Extraction typically doesn't use search
    const estimatedCost = estimateScraperCost(estimatedSearchQueries, estimatedAICalls, true);

    // Check budget throttle
    const throttleCheck = await shouldThrottle();
    if (throttleCheck.throttle) {
      res.status(429).json({
        error: 'Budget throttled',
        message: throttleCheck.reason,
        budgetStatus: {
          currentCost: throttleCheck.currentCost,
          dailyLimit: throttleCheck.dailyLimit,
          percentageUsed: throttleCheck.percentageUsed,
          remainingBudget: throttleCheck.remainingBudget,
        },
      });
      return;
    }

    // Check if we can afford this run
    if (estimatedCost > throttleCheck.remainingBudget) {
      res.status(429).json({
        error: 'Insufficient budget',
        message: `Estimated cost ($${estimatedCost.toFixed(2)}) exceeds remaining daily budget ($${throttleCheck.remainingBudget.toFixed(2)})`,
        estimatedCost,
        remainingBudget: throttleCheck.remainingBudget,
      });
      return;
    }

    // Create scraper run record
    const scraperId = body.target === 'venue'
      ? `extraction-${body.mode}-${body.venueId}`
      : body.target === 'chain'
        ? `extraction-${body.mode}-${body.chainId}`
        : `extraction-${body.mode}-all`;

    const config = {
      type: 'extraction',
      mode: body.mode,
      target: body.target,
      chainId: body.chainId,
      venueId: body.venueId,
      maxVenues: body.maxVenues,
      estimatedCost,
    };

    const run = await scraperRuns.startWithConfig(scraperId, config);

    // NOTE: Cloud Functions cannot spawn background processes
    // The extraction scraper needs to be run manually via CLI or Cloud Run Jobs
    // For now, we just create the run record and return - manual execution required

    // Mark the run as pending manual execution
    await scraperRuns.addLog(run.id, 'warn', 'Extraction requires manual execution via CLI. Cloud Functions cannot run long-running scrapers.');

    // Log the start
    const targetDesc = body.target === 'venue'
      ? `venue ${body.venueId}`
      : body.target === 'chain'
        ? `chain ${body.chainId}`
        : 'all venues';

    await scraperRuns.addLog(run.id, 'info', `Extraction ${body.mode} started for ${targetDesc}`);

    // Return response immediately
    const statusUrl = `/admin/scrapers/runs/${run.id}/stream`;

    res.status(202).json({
      runId: run.id,
      statusUrl,
      status: 'pending',
      message: 'Extraction run created. Note: Scraper requires manual CLI execution (Cloud Functions limitation).',
      config,
      estimatedCost,
      warning: 'Cloud Functions cannot run long-running scrapers. Run the scraper manually via CLI.',
    });
  },
  {
    allowedMethods: ['POST'],
    timeoutSeconds: 540,
    memory: '512MiB',
  }
);
