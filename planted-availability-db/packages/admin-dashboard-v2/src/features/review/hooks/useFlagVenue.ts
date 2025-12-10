/**
 * useFlagVenue Hook
 *
 * React Query hook for flagging venues for scraper priority.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@/lib/api/client';
import { reviewQueueKeys } from './useReviewQueue';

interface FlagVenueParams {
  venueId: string;
  flagType: 'dish_extraction' | 're_verification';
  priority: 'urgent' | 'high' | 'normal';
  reason?: string;
}

interface FlagVenueResponse {
  success: boolean;
  message: string;
  venue: {
    id: string;
    name: string;
    flag_type: string;
    flag_priority: string;
    flagged_at: string;
  };
}

async function flagVenue(params: FlagVenueParams): Promise<FlagVenueResponse> {
  return post<FlagVenueResponse>('/adminFlagVenue', params);
}

/**
 * useFlagVenue Hook
 *
 * Mutation hook for flagging a venue for scraper priority.
 */
export function useFlagVenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: flagVenue,
    onSuccess: () => {
      // Invalidate the review queue to reflect the flag
      queryClient.invalidateQueries({ queryKey: reviewQueueKeys.all });
    },
  });
}
