/**
 * Admin Review Queue API
 * GET /admin/review/queue
 *
 * Returns venues in a hierarchical structure for efficient review:
 * - Grouped by Country → VenueType (chain/independent) → Chain → Venue
 * - Includes dishes for each venue
 * - Supports filtering by status, country, confidence
 * - Uses cursor-based pagination
 */

import { z } from 'zod';
import {
  initializeFirestore,
  discoveredVenues,
  discoveredDishes,
  chains,
} from '@pad/database';
import { createAdminHandler } from '../../../middleware/adminHandler.js';
import type { SupportedCountry, DiscoveredVenueStatus, Chain } from '@pad/core';

/**
 * Known chain name patterns mapped to standardized chain identifiers.
 * Used for high-confidence automatic chain suggestions.
 * The key is a lowercase pattern to match, value is the canonical chain name.
 */
const KNOWN_CHAIN_PATTERNS: Record<string, string> = {
  // Dean & David variations
  'dean&david': 'Dean & David',
  'dean & david': 'Dean & David',
  'dean david': 'Dean & David',
  'deanddavid': 'Dean & David',
  'dean&david ': 'Dean & David',

  // Birdie Birdie
  'birdie birdie': 'Birdie Birdie',
  'birdiebirdie': 'Birdie Birdie',
  'birdie-birdie': 'Birdie Birdie',

  // Beets & Roots variations
  'beets&roots': 'Beets & Roots',
  'beets & roots': 'Beets & Roots',
  'beets and roots': 'Beets & Roots',
  'beetsandroots': 'Beets & Roots',

  // Green Club
  'green club': 'Green Club',
  'greenclub': 'Green Club',

  // Nooch
  'nooch asian kitchen': 'Nooch',
  'nooch asian': 'Nooch',
  'nooch': 'Nooch',

  // Rice Up
  'rice up': 'Rice Up',
  'rice up!': 'Rice Up',
  'riceup': 'Rice Up',

  // Smash Bro
  'smash bro': 'Smash Bro',
  'smashbro': 'Smash Bro',

  // Doen Doen
  'doen doen': 'Doen Doen',
  'doendoen': 'Doen Doen',

  // Hiltl
  'hiltl': 'Hiltl',
  'haus hiltl': 'Hiltl',

  // Tibits
  'tibits': 'Tibits',

  // Kaimug
  'kaimug': 'Kaimug',

  // Stadtsalat
  'stadtsalat': 'Stadtsalat',

  // Råbowls
  'råbowls': 'Råbowls',
  'rabowls': 'Råbowls',

  // Chidoba
  'chidoba': 'Chidoba',

  // Hans im Glück
  'hans im glück': 'Hans im Glück',
  'hans im glueck': 'Hans im Glück',

  // Vapiano
  'vapiano': 'Vapiano',

  // Cotidiano
  'cotidiano': 'Cotidiano',

  // Yardbird
  'yardbird': 'Yardbird',

  // Brezelkönig
  'brezelkönig': 'Brezelkönig',
  'brezelkoenig': 'Brezelkönig',
  'brezelkonig': 'Brezelkönig',
};

interface ChainSuggestion {
  chainId: string;
  chainName: string;
  confidence: number;
  matchedPattern: string;
}

// Initialize Firestore
initializeFirestore();

// Validation schema for query parameters
const queueQuerySchema = z.object({
  country: z.enum(['CH', 'DE', 'AT']).optional(),
  status: z.enum(['discovered', 'verified', 'rejected', 'promoted', 'stale']).optional(),
  minConfidence: z.string().transform(Number).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.string().transform(Number).optional().default('50'),
});

interface CountryGroup {
  country: SupportedCountry;
  venueTypes: VenueTypeGroup[];
  totalVenues: number;
}

interface VenueTypeGroup {
  type: 'chain' | 'independent' | 'suggested';
  chains?: ChainGroup[];
  venues?: ReviewVenue[];
  totalVenues: number;
}

interface ChainGroup {
  chainId: string;
  chainName: string;
  venues: ReviewVenue[];
  totalVenues: number;
}

interface ReviewVenue {
  id: string;
  name: string;
  chainId?: string;
  chainName?: string;
  // Suggested chain for venues that don't have chain_id set but match known patterns
  suggestedChainId?: string;
  suggestedChainName?: string;
  suggestedChainConfidence?: number;
  address: {
    street?: string;
    city: string;
    postalCode?: string;
    country: SupportedCountry;
  };
  confidenceScore: number;
  status: DiscoveredVenueStatus;
  createdAt: Date;
  dishes: ReviewDish[];
  deliveryPlatforms: {
    platform: string;
    url: string;
    active: boolean;
  }[];
  // Flag fields for scraper priority
  flagType?: 'dish_extraction' | 're_verification' | null;
  flagPriority?: 'urgent' | 'high' | 'normal';
  flagReason?: string;
  flaggedAt?: Date;
}

interface ReviewDish {
  id: string;
  name: string;
  description?: string;
  product: string;
  confidence: number;
  price?: string;
  imageUrl?: string;
  status: string;
}

/**
 * Suggests a chain for a venue based on its name pattern.
 * Only suggests chains that exist in the database.
 * Returns null if no match found or if venue already has a chain assigned.
 */
async function suggestChainForVenue(
  venueName: string,
  existingChainId: string | undefined,
  chainLookup: Map<string, Chain>
): Promise<ChainSuggestion | null> {
  // Don't suggest if already has a chain
  if (existingChainId) {
    return null;
  }

  const lowerName = venueName.toLowerCase();

  // Sort patterns by length (longest first) to match most specific patterns first
  const sortedPatterns = Object.entries(KNOWN_CHAIN_PATTERNS)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [pattern, canonicalName] of sortedPatterns) {
    if (lowerName.includes(pattern)) {
      // Look up the chain by canonical name in our loaded chains
      const chain = Array.from(chainLookup.values()).find(
        c => c.name.toLowerCase() === canonicalName.toLowerCase()
      );

      if (chain) {
        return {
          chainId: chain.id,
          chainName: chain.name,
          confidence: 95, // High confidence for exact pattern matches
          matchedPattern: pattern,
        };
      } else {
        // Chain exists in patterns but not in database - suggest creating it
        return {
          chainId: '', // Empty means chain needs to be created
          chainName: canonicalName,
          confidence: 90,
          matchedPattern: pattern,
        };
      }
    }
  }

  return null;
}

/**
 * Handler for GET /admin/review/queue
 */
export const adminReviewQueueHandler = createAdminHandler(
  async (req, res) => {
    // Validate query parameters
    const validation = queueQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.errors,
      });
      return;
    }

    const {
      country,
      status = 'discovered',
      minConfidence = 0,
      search,
      cursor,
      limit = 50,
    } = validation.data;

    // Load all chains for suggestion matching
    const allChains = await chains.query({});
    const chainLookup = new Map<string, Chain>(allChains.map(c => [c.id, c]));

    // Fetch venues based on filters
    let venues = await discoveredVenues.getByStatus(status as DiscoveredVenueStatus);

    // Apply filters
    if (country) {
      venues = venues.filter(v => v.address.country === country);
    }

    if (minConfidence > 0) {
      venues = venues.filter(v => v.confidence_score >= minConfidence);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      venues = venues.filter(v =>
        v.name.toLowerCase().includes(searchLower) ||
        v.address.city.toLowerCase().includes(searchLower) ||
        v.chain_name?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by confidence score descending, then by creation date
    venues.sort((a, b) => {
      if (b.confidence_score !== a.confidence_score) {
        return b.confidence_score - a.confidence_score;
      }
      return b.created_at.getTime() - a.created_at.getTime();
    });

    // Handle cursor-based pagination
    let startIndex = 0;
    if (cursor) {
      // Cursor is the ID of the last item from previous page
      const cursorIndex = venues.findIndex(v => v.id === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedVenues = venues.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < venues.length;
    const nextCursor = hasMore ? paginatedVenues[paginatedVenues.length - 1]?.id : undefined;

    // Get all venue IDs for batch fetching dishes from discovered_dishes collection
    const venueIds = paginatedVenues.map(v => v.id);

    // Fetch dishes from discovered_dishes collection for all venues at once
    const allDiscoveredDishes = await discoveredDishes.query({});
    const dishesByVenueId = new Map<string, typeof allDiscoveredDishes>();

    for (const dish of allDiscoveredDishes) {
      if (venueIds.includes(dish.venue_id)) {
        if (!dishesByVenueId.has(dish.venue_id)) {
          dishesByVenueId.set(dish.venue_id, []);
        }
        dishesByVenueId.get(dish.venue_id)!.push(dish);
      }
    }

    // Map venues to ReviewVenue format with dishes from both sources
    const venuesWithDishes = await Promise.all(paginatedVenues.map(async (venue) => {
      // First try embedded dishes from the venue document
      const embeddedDishes = venue.dishes || [];

      // Then check discovered_dishes collection
      const collectionDishes = dishesByVenueId.get(venue.id) || [];

      let reviewDishes: ReviewDish[] = [];

      // Prefer embedded dishes if available, otherwise use collection dishes
      if (embeddedDishes.length > 0) {
        reviewDishes = embeddedDishes.map((dish, index) => ({
          id: `${venue.id}-dish-${index}`,
          name: dish.name,
          description: dish.description,
          product: dish.planted_product,
          confidence: dish.confidence,       // Embedded uses 'confidence' (0-100)
          price: dish.price,                 // Simple string like "CHF 18.90"
          imageUrl: undefined,               // Embedded dishes don't have images
          status: 'discovered',
        }));
      } else if (collectionDishes.length > 0) {
        // Use dishes from discovered_dishes collection
        reviewDishes = collectionDishes.map((dish) => ({
          id: dish.id,
          name: dish.name,
          description: dish.description,
          product: dish.planted_product,
          confidence: dish.confidence_score, // Collection uses 'confidence_score' (0-100)
          price: dish.prices?.[0]?.amount ? `${dish.prices[0].currency} ${dish.prices[0].amount}` : undefined,
          imageUrl: dish.image_url,
          status: dish.status || 'discovered',
        }));
      }

      // Get chain suggestion for venues without chain_id
      const chainSuggestion = await suggestChainForVenue(
        venue.name,
        venue.chain_id,
        chainLookup
      );

      const reviewVenue: ReviewVenue = {
        id: venue.id,
        name: venue.name,
        chainId: venue.chain_id,
        chainName: venue.chain_name,
        // Include chain suggestion if available
        suggestedChainId: chainSuggestion?.chainId,
        suggestedChainName: chainSuggestion?.chainName,
        suggestedChainConfidence: chainSuggestion?.confidence,
        address: {
          street: venue.address.street,
          city: venue.address.city,
          postalCode: venue.address.postal_code,
          country: venue.address.country,
        },
        confidenceScore: venue.confidence_score,
        status: venue.status,
        createdAt: venue.created_at,
        dishes: reviewDishes,
        deliveryPlatforms: venue.delivery_platforms?.map(dp => ({
          platform: dp.platform,
          url: dp.url,
          active: dp.active ?? true,
        })) || [],
        // Include flag data
        flagType: venue.flag_type,
        flagPriority: venue.flag_priority,
        flagReason: venue.flag_reason,
        flaggedAt: venue.flagged_at,
      };

      return reviewVenue;
    }));

    // Build hierarchical structure
    const hierarchy = buildHierarchy(venuesWithDishes);

    // Calculate statistics
    const stats = await calculateStats(country, status as DiscoveredVenueStatus);

    res.json({
      items: venuesWithDishes,
      hierarchy,
      stats,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: venues.length,
        pageSize: paginatedVenues.length,
      },
    });
  },
  { allowedMethods: ['GET'] }
);

/**
 * Build hierarchical structure: Country → VenueType → Chain → Venue
 */
function buildHierarchy(venues: ReviewVenue[]): CountryGroup[] {
  const countryMap = new Map<SupportedCountry, ReviewVenue[]>();

  // Group by country
  for (const venue of venues) {
    const country = venue.address.country;
    if (!countryMap.has(country)) {
      countryMap.set(country, []);
    }
    countryMap.get(country)!.push(venue);
  }

  // Build country groups
  const countryGroups: CountryGroup[] = [];

  for (const [country, countryVenues] of Array.from(countryMap)) {
    // Separate venues into three groups:
    // 1. Already assigned to chains (have chainId)
    // 2. Suggested chains (no chainId but have suggestedChainId)
    // 3. Independent (no chainId and no suggestion)
    const chainVenues = countryVenues.filter(v => v.chainId);
    const suggestedChainVenues = countryVenues.filter(v => !v.chainId && v.suggestedChainId);
    const independentVenues = countryVenues.filter(v => !v.chainId && !v.suggestedChainId);

    const venueTypes: VenueTypeGroup[] = [];

    // Build assigned chain groups
    if (chainVenues.length > 0) {
      const chainMap = new Map<string, ReviewVenue[]>();

      for (const venue of chainVenues) {
        const chainId = venue.chainId!;
        if (!chainMap.has(chainId)) {
          chainMap.set(chainId, []);
        }
        chainMap.get(chainId)!.push(venue);
      }

      const chainsArray: ChainGroup[] = [];
      for (const [chainId, venues] of Array.from(chainMap)) {
        chainsArray.push({
          chainId,
          chainName: venues[0].chainName || 'Unknown Chain',
          venues,
          totalVenues: venues.length,
        });
      }

      // Sort chains by total venues descending
      chainsArray.sort((a, b) => b.totalVenues - a.totalVenues);

      venueTypes.push({
        type: 'chain',
        chains: chainsArray,
        totalVenues: chainVenues.length,
      });
    }

    // Build suggested chain groups (venues that SHOULD be linked to chains)
    if (suggestedChainVenues.length > 0) {
      const suggestedMap = new Map<string, ReviewVenue[]>();

      for (const venue of suggestedChainVenues) {
        // Group by suggested chain name (since suggestedChainId might be empty for new chains)
        const key = venue.suggestedChainName || 'Unknown';
        if (!suggestedMap.has(key)) {
          suggestedMap.set(key, []);
        }
        suggestedMap.get(key)!.push(venue);
      }

      const suggestedChains: ChainGroup[] = [];
      for (const [chainName, venues] of Array.from(suggestedMap)) {
        suggestedChains.push({
          chainId: venues[0].suggestedChainId || '', // May be empty if chain needs to be created
          chainName,
          venues,
          totalVenues: venues.length,
        });
      }

      // Sort by total venues descending
      suggestedChains.sort((a, b) => b.totalVenues - a.totalVenues);

      venueTypes.push({
        type: 'suggested',
        chains: suggestedChains,
        totalVenues: suggestedChainVenues.length,
      });
    }

    // Add truly independent venues (no chain and no suggestion)
    if (independentVenues.length > 0) {
      venueTypes.push({
        type: 'independent',
        venues: independentVenues,
        totalVenues: independentVenues.length,
      });
    }

    countryGroups.push({
      country,
      venueTypes,
      totalVenues: countryVenues.length,
    });
  }

  // Sort by country name
  countryGroups.sort((a, b) => a.country.localeCompare(b.country));

  return countryGroups;
}

/**
 * Calculate statistics for the queue
 */
async function calculateStats(
  country?: SupportedCountry,
  status?: DiscoveredVenueStatus
) {
  // Get all venues for stats
  const allVenues = await discoveredVenues.getAll();

  // Filter by country if specified
  const filteredVenues = country
    ? allVenues.filter(v => v.address.country === country)
    : allVenues;

  // Count by status
  const byStatus = {
    pending: filteredVenues.filter(v => v.status === 'discovered').length,
    verified: filteredVenues.filter(v => v.status === 'verified').length,
    rejected: filteredVenues.filter(v => v.status === 'rejected').length,
    promoted: filteredVenues.filter(v => v.status === 'promoted').length,
    stale: filteredVenues.filter(v => v.status === 'stale').length,
  };

  // Count by country
  const byCountry: Record<string, number> = {};
  for (const venue of allVenues) {
    byCountry[venue.address.country] = (byCountry[venue.address.country] || 0) + 1;
  }

  // Count by confidence level
  const byConfidence = {
    low: filteredVenues.filter(v => v.confidence_score < 40).length,
    medium: filteredVenues.filter(v => v.confidence_score >= 40 && v.confidence_score < 70).length,
    high: filteredVenues.filter(v => v.confidence_score >= 70).length,
  };

  // Count chain assignment status
  const withChain = filteredVenues.filter(v => v.chain_id).length;
  const withoutChain = filteredVenues.filter(v => !v.chain_id).length;
  const markedAsChain = filteredVenues.filter(v => v.is_chain && !v.chain_id).length; // Marked as chain but not assigned

  // Count flagged venues
  const flaggedForDishExtraction = filteredVenues.filter(v => v.flag_type === 'dish_extraction').length;
  const flaggedForReVerification = filteredVenues.filter(v => v.flag_type === 're_verification').length;
  const totalFlagged = flaggedForDishExtraction + flaggedForReVerification;

  return {
    pending: byStatus.pending,
    verified: byStatus.verified,
    rejected: byStatus.rejected,
    promoted: byStatus.promoted,
    stale: byStatus.stale,
    byCountry,
    byConfidence,
    chainAssignment: {
      assigned: withChain,
      unassigned: withoutChain,
      needsAssignment: markedAsChain, // These are likely chain venues without chain_id
    },
    flagged: {
      total: totalFlagged,
      dish_extraction: flaggedForDishExtraction,
      re_verification: flaggedForReVerification,
    },
    total: filteredVenues.length,
  };
}
