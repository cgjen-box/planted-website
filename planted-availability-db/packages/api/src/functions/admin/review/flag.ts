/**
 * Admin Flag Venue API
 * POST /adminFlagVenue
 *
 * Flags a venue for priority scraper action (dish extraction or re-verification)
 * - Updates discovered_venue with flag_type, flag_priority, flag_reason
 * - Records flagging in changelog
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

// Validation schema for flag request body
const flagBodySchema = z.object({
  venueId: z.string().min(1),
  flagType: z.enum(['dish_extraction', 're_verification']),
  priority: z.enum(['urgent', 'high', 'normal']),
  reason: z.string().optional(),
});

// Validation schema for clear flag request body
const clearFlagBodySchema = z.object({
  venueId: z.string().min(1),
});

/**
 * Handler for POST /adminFlagVenue
 * Flags a venue for priority scraper action
 */
export const adminFlagVenueHandler = createAdminHandler(
  async (req, res) => {
    // Validate request body
    const validation = flagBodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
      return;
    }

    const { venueId, flagType, priority, reason } = validation.data;

    // Get the venue
    const venue = await discoveredVenues.getById(venueId);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found' });
      return;
    }

    // Flag the venue
    const userId = req.user?.uid || 'unknown';
    const updatedVenue = await discoveredVenues.flagVenue(
      venueId,
      flagType,
      priority,
      userId,
      reason
    );

    // Log the change
    try {
      await changeLogs.log({
        action: 'updated',
        collection: 'discovered_venues',
        document_id: venueId,
        changes: [
          { field: 'flag_type', before: venue.flag_type || null, after: flagType },
          { field: 'flag_priority', before: venue.flag_priority || null, after: priority },
        ],
        source: { type: 'manual', user_id: userId },
        reason: `Flagged for ${flagType} with ${priority} priority${reason ? ': ' + reason : ''}`,
      });
    } catch (e) {
      console.warn('Failed to log change:', e);
    }

    res.json({
      success: true,
      message: `Venue flagged for ${flagType}`,
      venue: {
        id: updatedVenue.id,
        name: updatedVenue.name,
        flag_type: updatedVenue.flag_type,
        flag_priority: updatedVenue.flag_priority,
        flagged_at: updatedVenue.flagged_at,
      },
    });
  },
  { allowedMethods: ['POST'] }
);

/**
 * Handler for POST /adminClearVenueFlag
 * Clears the flag from a venue
 */
export const adminClearVenueFlagHandler = createAdminHandler(
  async (req, res) => {
    // Validate request body
    const validation = clearFlagBodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
      return;
    }

    const { venueId } = validation.data;

    // Get the venue
    const venue = await discoveredVenues.getById(venueId);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found' });
      return;
    }

    // Check if venue has a flag
    if (!venue.flag_type) {
      res.status(400).json({ error: 'Venue is not flagged' });
      return;
    }

    // Clear the flag
    const updatedVenue = await discoveredVenues.clearFlag(venueId);

    // Log the change
    try {
      await changeLogs.log({
        action: 'updated',
        collection: 'discovered_venues',
        document_id: venueId,
        changes: [
          { field: 'flag_type', before: venue.flag_type, after: null },
          { field: 'flag_priority', before: venue.flag_priority || null, after: null },
        ],
        source: { type: 'manual', user_id: req.user?.uid },
        reason: 'Flag cleared',
      });
    } catch (e) {
      console.warn('Failed to log change:', e);
    }

    res.json({
      success: true,
      message: 'Venue flag cleared',
      venue: {
        id: updatedVenue.id,
        name: updatedVenue.name,
      },
    });
  },
  { allowedMethods: ['POST'] }
);

/**
 * Handler for GET /adminFlaggedVenues
 * Gets all flagged venues, optionally filtered by flag type
 */
export const adminFlaggedVenuesHandler = createAdminHandler(
  async (req, res) => {
    const flagType = req.query.flagType as 'dish_extraction' | 're_verification' | undefined;

    // Get flagged venues (sorted by priority and date)
    const venues = await discoveredVenues.getFlaggedVenues(flagType);

    res.json({
      success: true,
      venues: venues.map(v => ({
        id: v.id,
        name: v.name,
        address: v.address,
        flag_type: v.flag_type,
        flag_priority: v.flag_priority,
        flag_reason: v.flag_reason,
        flagged_at: v.flagged_at,
        flagged_by: v.flagged_by,
        dishes_count: v.dishes?.length || 0,
        confidence_score: v.confidence_score,
        status: v.status,
      })),
      count: venues.length,
    });
  },
  { allowedMethods: ['GET'] }
);
