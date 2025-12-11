/**
 * useUpdateAddress Hook
 *
 * React Query mutation for updating venue address (street and/or city) with optimistic updates.
 */

import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { updateVenueAddress } from '../api/reviewApi';
import { ReviewQueueResponse } from '../types';
import { reviewQueueKeys } from './useReviewQueue';

interface UpdateAddressOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UpdateAddressParams {
  venueId: string;
  street?: string;
  city?: string;
}

interface UpdateAddressResult {
  success: boolean;
  venue: {
    id: string;
    name: string;
    address: {
      street: string;
      city: string;
      country: string;
    };
  };
}

/**
 * useUpdateAddress Hook
 */
export function useUpdateAddress(options?: UpdateAddressOptions): UseMutationResult<
  UpdateAddressResult,
  Error,
  UpdateAddressParams
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ venueId, street, city }: UpdateAddressParams) =>
      updateVenueAddress(venueId, { street, city }),
    onMutate: async ({ venueId, street, city }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: reviewQueueKeys.lists() });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: reviewQueueKeys.lists() });

      // Optimistically update the venue's address
      queryClient.setQueriesData<ReviewQueueResponse>(
        { queryKey: reviewQueueKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((venue) =>
              venue.id === venueId
                ? {
                    ...venue,
                    address: street !== undefined ? street : venue.address,
                    city: city !== undefined ? city : venue.city,
                  }
                : venue
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      options?.onError?.(error);
    },
    onSuccess: () => {
      options?.onSuccess?.();
    },
    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: reviewQueueKeys.lists() });
    },
  });
}
