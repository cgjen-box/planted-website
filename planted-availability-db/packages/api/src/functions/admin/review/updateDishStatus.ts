/**
 * Admin Update Dish Status API
 * POST /adminUpdateDishStatus
 *
 * Updates the status of an embedded dish within a venue.
 * Used for individual dish approval/rejection during venue review.
 */

import { z } from 'zod';
import {
  initializeFirestore,
  discoveredVenues,
  changeLogs,
} from '@pad/database';
import { createAdminHandler } from '../../../middleware/adminHandler.js';

// Initialize Firestore
initializeFirestore();

// Validation schema for update dish status request body
const updateDishStatusBodySchema = z.object({
  venueId: z.string().min(1),
  dishId: z.string().min(1), // Format: "{venueId}-dish-{index}"
  status: z.enum(['verified', 'rejected']),
});

/**
 * Parse dish ID to extract the index
 * Dish IDs are formatted as "{venueId}-dish-{index}"
 */
function parseDishIndex(dishId: string, venueId: string): number {
  const prefix = `${venueId}-dish-`;
  if (!dishId.startsWith(prefix)) {
    throw new Error(`Invalid dish ID format: ${dishId}`);
  }
  const indexStr = dishId.substring(prefix.length);
  const index = parseInt(indexStr, 10);
  if (isNaN(index) || index < 0) {
    throw new Error(`Invalid dish index in ID: ${dishId}`);
  }
  return index;
}

/**
 * Handler for POST /adminUpdateDishStatus
 */
export const adminUpdateDishStatusHandler = createAdminHandler(
  async (req, res) => {
    // Validate request body
    const validation = updateDishStatusBodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
      return;
    }

    const { venueId, dishId, status } = validation.data;

    // Get the venue
    const venue = await discoveredVenues.getById(venueId);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found' });
      return;
    }

    // Parse the dish index from the dish ID
    let dishIndex: number;
    try {
      dishIndex = parseDishIndex(dishId, venueId);
    } catch (error) {
      res.status(400).json({
        error: 'Invalid dish ID',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      return;
    }

    // Validate dish exists
    if (!venue.dishes || dishIndex >= venue.dishes.length) {
      res.status(404).json({
        error: 'Dish not found',
        message: `Dish at index ${dishIndex} not found in venue`,
      });
      return;
    }

    const previousStatus = venue.dishes[dishIndex].status || 'discovered';

    // Update the dish status
    const updatedVenue = await discoveredVenues.updateEmbeddedDishStatus(
      venueId,
      dishIndex,
      status
    );

    // Log the change
    try {
      await changeLogs.log({
        action: 'updated',
        collection: 'discovered_venues',
        document_id: venueId,
        changes: [
          {
            field: `dishes[${dishIndex}].status`,
            before: previousStatus,
            after: status,
          },
        ],
        source: { type: 'manual', user_id: req.user?.uid },
        reason: `Admin ${status === 'verified' ? 'approved' : 'rejected'} dish "${venue.dishes[dishIndex].name}"`,
      });
    } catch (e) {
      console.warn('Failed to log change:', e);
    }

    res.json({
      success: true,
      message: `Dish ${status === 'verified' ? 'approved' : 'rejected'} successfully`,
      dish: {
        id: dishId,
        name: updatedVenue.dishes[dishIndex].name,
        status,
      },
      venue: {
        id: venueId,
        name: venue.name,
      },
    });
  },
  { allowedMethods: ['POST'] }
);
