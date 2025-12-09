import { onRequest, HttpsOptions } from 'firebase-functions/v2/https';
import type { Request, Response } from 'express';
import { initializeFirestore, aiFeedback } from '@pad/database';
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
 * Admin API for AI Feedback
 *
 * POST /admin/feedback - Submit new feedback
 * GET /admin/feedback/stats - Get feedback statistics
 * GET /admin/feedback/export - Export training data as JSON
 * GET /admin/feedback/analysis/confidence - Analyze confidence accuracy
 * GET /admin/feedback/analysis/products - Analyze product performance
 */
export const adminFeedbackHandler = onRequest(functionOptions, async (req: Request, res: Response) => {
  await withAdminAuth(req, res, async (authReq, authRes) => {
    try {
      const pathParts = authReq.path.split('/').filter(Boolean);
      // Path structure: /feedback, /feedback/stats, /feedback/export, /feedback/analysis/:type
      const action = pathParts.length >= 2 ? pathParts[1] : undefined;
      const subAction = pathParts.length >= 3 ? pathParts[2] : undefined;

      switch (authReq.method) {
        case 'GET': {
          // GET /admin/feedback/stats
          if (action === 'stats') {
            const sinceParam = authReq.query.since as string;
            const since = sinceParam ? new Date(sinceParam) : undefined;

            const stats = await aiFeedback.getStats(since);
            authRes.json(stats);
            return;
          }

          // GET /admin/feedback/export
          if (action === 'export') {
            const sinceParam = authReq.query.since as string;
            const since = sinceParam ? new Date(sinceParam) : undefined;

            const exportData = await aiFeedback.exportTrainingData(since);

            // Set headers for file download
            authRes.setHeader('Content-Type', 'application/json');
            authRes.setHeader('Content-Disposition', `attachment; filename="ai-feedback-export-${new Date().toISOString().split('T')[0]}.json"`);
            authRes.json(exportData);
            return;
          }

          // GET /admin/feedback/analysis/confidence
          if (action === 'analysis' && subAction === 'confidence') {
            const analysis = await aiFeedback.analyzeConfidence();
            authRes.json({ analysis });
            return;
          }

          // GET /admin/feedback/analysis/products
          if (action === 'analysis' && subAction === 'products') {
            const performance = await aiFeedback.analyzeProductPerformance();
            authRes.json({ products: performance });
            return;
          }

          // GET /admin/feedback - List feedback (with filters)
          const venueId = authReq.query.venue_id as string;
          const dishId = authReq.query.dish_id as string;
          const discoveredVenueId = authReq.query.discovered_venue_id as string;
          const discoveredDishId = authReq.query.discovered_dish_id as string;

          let feedbackList;

          if (venueId) {
            feedbackList = await aiFeedback.getByVenue(venueId);
          } else if (dishId) {
            feedbackList = await aiFeedback.getByDish(dishId);
          } else if (discoveredVenueId) {
            feedbackList = await aiFeedback.getByDiscoveredVenue(discoveredVenueId);
          } else if (discoveredDishId) {
            feedbackList = await aiFeedback.getByDiscoveredDish(discoveredDishId);
          } else {
            // Get all feedback with optional limit
            const limit = parseInt(authReq.query.limit as string, 10) || 50;
            feedbackList = await aiFeedback.getAll({ limit });
          }

          authRes.json({ feedback: feedbackList, total: feedbackList.length });
          break;
        }

        case 'POST': {
          // POST /admin/feedback - Submit new feedback
          const body = authReq.body;

          // Validate required fields
          if (!body.ai_prediction || !body.human_feedback) {
            authRes.status(400).json({
              error: 'Missing required fields: ai_prediction, human_feedback'
            });
            return;
          }

          // Validate AI prediction structure
          if (!body.ai_prediction.product_sku ||
              typeof body.ai_prediction.confidence !== 'number' ||
              !Array.isArray(body.ai_prediction.factors)) {
            authRes.status(400).json({
              error: 'Invalid ai_prediction structure. Required: product_sku, confidence, factors[]'
            });
            return;
          }

          // Validate human feedback type
          const validFeedbackTypes = ['correct', 'wrong_product', 'not_planted', 'needs_review'];
          if (!validFeedbackTypes.includes(body.human_feedback)) {
            authRes.status(400).json({
              error: `Invalid human_feedback. Must be one of: ${validFeedbackTypes.join(', ')}`
            });
            return;
          }

          // Validate that at least one reference is provided
          if (!body.dish_id && !body.venue_id && !body.discovered_venue_id && !body.discovered_dish_id) {
            authRes.status(400).json({
              error: 'At least one reference required: dish_id, venue_id, discovered_venue_id, or discovered_dish_id'
            });
            return;
          }

          // If wrong_product, require correct_product_sku
          if (body.human_feedback === 'wrong_product' && !body.correct_product_sku) {
            authRes.status(400).json({
              error: 'correct_product_sku required when human_feedback is "wrong_product"'
            });
            return;
          }

          // Create feedback entry
          const feedback = await aiFeedback.recordFeedback({
            dish_id: body.dish_id,
            venue_id: body.venue_id,
            discovered_venue_id: body.discovered_venue_id,
            discovered_dish_id: body.discovered_dish_id,
            ai_prediction: {
              product_sku: body.ai_prediction.product_sku,
              confidence: body.ai_prediction.confidence,
              factors: body.ai_prediction.factors,
            },
            human_feedback: body.human_feedback,
            correct_product_sku: body.correct_product_sku,
            feedback_notes: body.feedback_notes,
            reviewer_id: authReq.user?.uid || 'unknown',
          });

          authRes.status(201).json({
            success: true,
            feedback,
            message: 'Feedback recorded successfully'
          });
          break;
        }

        default:
          authRes.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('Admin feedback error:', error);
      authRes.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});
