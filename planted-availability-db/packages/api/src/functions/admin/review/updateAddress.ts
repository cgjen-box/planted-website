/**
 * Admin Update Venue Address API
 * POST /adminUpdateVenueAddress
 *
 * Updates the address (street and/or city) of a discovered venue
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

// Validation schema for update address request body
const updateAddressBodySchema = z.object({
  venueId: z.string().min(1),
  street: z.string().optional(),
  city: z.string().optional(),
}).refine(data => data.street !== undefined || data.city !== undefined, {
  message: 'At least one of street or city must be provided',
});

/**
 * Handler for POST /adminUpdateVenueAddress
 */
export const adminUpdateVenueAddressHandler = createAdminHandler(
  async (req, res) => {
    // Validate request body
    const validation = updateAddressBodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.errors,
      });
      return;
    }

    const { venueId, street, city } = validation.data;

    // Get the venue
    const venue = await discoveredVenues.getById(venueId);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found' });
      return;
    }

    // Build the update object
    const changes: Array<{ field: string; before: string | undefined; after: string | undefined }> = [];
    const addressUpdate: Record<string, string> = {};

    if (street !== undefined && street !== venue.address.street) {
      addressUpdate.street = street;
      changes.push({ field: 'address.street', before: venue.address.street, after: street });
    }

    if (city !== undefined && city !== venue.address.city) {
      addressUpdate.city = city;
      changes.push({ field: 'address.city', before: venue.address.city, after: city });
    }

    // Check if there are any changes
    if (changes.length === 0) {
      res.status(400).json({
        error: 'No changes',
        message: 'The venue already has these values',
      });
      return;
    }

    // Update the venue address
    const updatedVenue = await discoveredVenues.update(venueId, {
      address: {
        ...venue.address,
        ...addressUpdate,
      },
    });

    // Log the change
    try {
      await changeLogs.log({
        action: 'updated',
        collection: 'discovered_venues',
        document_id: venueId,
        changes,
        source: { type: 'manual', user_id: req.user?.uid },
        reason: `Admin updated venue address`,
      });
    } catch (e) {
      console.warn('Failed to log change:', e);
    }

    res.json({
      success: true,
      message: 'Venue address updated successfully',
      venue: {
        id: updatedVenue.id,
        name: updatedVenue.name,
        address: {
          street: updatedVenue.address.street,
          city: updatedVenue.address.city,
          country: updatedVenue.address.country,
        },
      },
    });
  },
  { allowedMethods: ['POST'] }
);
