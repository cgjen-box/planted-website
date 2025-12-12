/**
 * useDuplicates Hook
 *
 * React Query hooks for finding and deleting duplicate venues.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { findDuplicateVenues, deleteDuplicateVenues } from '../api/liveVenuesApi';
import { liveVenuesKeys } from './useLiveVenues';

/**
 * Query key factory for duplicates
 */
export const duplicatesKeys = {
  all: ['duplicates'] as const,
  list: () => [...duplicatesKeys.all, 'list'] as const,
};

/**
 * Hook for fetching duplicate venues
 */
export function useDuplicates(enabled = true) {
  return useQuery({
    queryKey: duplicatesKeys.list(),
    queryFn: () => findDuplicateVenues(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });
}

/**
 * Hook for deleting duplicate venues
 */
export function useDeleteDuplicates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (venueIds: string[]) => deleteDuplicateVenues(venueIds),
    onSuccess: () => {
      // Invalidate both duplicates and live venues queries
      queryClient.invalidateQueries({ queryKey: duplicatesKeys.all });
      queryClient.invalidateQueries({ queryKey: liveVenuesKeys.all });
    },
  });
}

/**
 * Hook to invalidate duplicates queries
 */
export function useInvalidateDuplicates() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: duplicatesKeys.all });
  };
}
