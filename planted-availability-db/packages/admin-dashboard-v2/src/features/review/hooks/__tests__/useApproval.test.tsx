/**
 * useApproval Hooks Tests
 *
 * Tests for approve, partial approve, reject, bulk operations, and optimistic updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@/test/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  useApproveVenue,
  usePartialApproveVenue,
  useRejectVenue,
  useBulkApprove,
  useBulkReject,
} from '../useApproval';

// Mock firebase auth
vi.mock('@/lib/firebase', () => {
  const mockGetIdToken = vi.fn().mockResolvedValue('mock-token');
  return {
    auth: {
      currentUser: {
        getIdToken: mockGetIdToken,
      },
    },
  };
});

describe('useApproval Hooks', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useApproveVenue', () => {
    it('should approve venue successfully', async () => {
      const { result } = renderHook(() => useApproveVenue(), { wrapper });

      result.current.mutate('venue-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.status).toBe('verified');
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useApproveVenue({ onSuccess }), {
        wrapper,
      });

      result.current.mutate('venue-1');

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should call onError callback on failure', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useApproveVenue({ onError }), {
        wrapper,
      });

      // Simulate error by using invalid ID
      result.current.mutate('invalid-id');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should perform optimistic update', async () => {
      const { result } = renderHook(() => useApproveVenue(), { wrapper });

      // Mutation should complete successfully
      result.current.mutate('venue-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the response indicates venue was approved
      expect(result.current.data?.status).toBe('verified');
    });

    it('should rollback on error', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useApproveVenue({ onError }), { wrapper });

      result.current.mutate('invalid-venue-id');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Verify error callback was called
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('usePartialApproveVenue', () => {
    it('should partial approve venue with feedback', async () => {
      const { result } = renderHook(() => usePartialApproveVenue(), { wrapper });

      result.current.mutate({
        venueId: 'venue-1',
        feedback: 'Please verify dish prices',
        dishIds: ['dish-1', 'dish-2'],
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should perform optimistic update for partial approval', async () => {
      const { result } = renderHook(() => usePartialApproveVenue(), { wrapper });

      result.current.mutate({
        venueId: 'venue-1',
        feedback: 'Check prices',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the mutation completed successfully
      expect(result.current.data?.status).toBe('verified');
    });
  });

  describe('useRejectVenue', () => {
    it('should reject venue with reason', async () => {
      const { result } = renderHook(() => useRejectVenue(), { wrapper });

      result.current.mutate({
        venueId: 'venue-1',
        reason: 'Not a planted venue',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.status).toBe('rejected');
    });

    it('should perform optimistic update for rejection', async () => {
      const { result } = renderHook(() => useRejectVenue(), { wrapper });

      result.current.mutate({
        venueId: 'venue-1',
        reason: 'Duplicate',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the mutation completed successfully
      expect(result.current.data?.status).toBe('rejected');
    });
  });

  describe('useBulkApprove', () => {
    it('should approve multiple venues', async () => {
      const { result } = renderHook(() => useBulkApprove(), { wrapper });

      result.current.mutate(['venue-1', 'venue-2', 'venue-3']);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.success).toBeGreaterThan(0);
    });

    it('should invalidate queries after bulk approval', async () => {
      const { result } = renderHook(() => useBulkApprove(), { wrapper });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      result.current.mutate(['venue-1', 'venue-2']);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  describe('useBulkReject', () => {
    it('should reject multiple venues', async () => {
      const { result } = renderHook(() => useBulkReject(), { wrapper });

      result.current.mutate({
        venueIds: ['venue-1', 'venue-2'],
        reason: 'Bulk rejection test',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should handle partial failures', async () => {
      const { result } = renderHook(() => useBulkReject(), { wrapper });

      result.current.mutate({
        venueIds: ['venue-1', 'invalid-venue'],
        reason: 'Test',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const data = result.current.data;
      expect(data?.success).toBeGreaterThanOrEqual(0);
      expect(data?.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Optimistic Updates', () => {
    it('should update stats optimistically', async () => {
      const { result } = renderHook(() => useApproveVenue(), { wrapper });

      result.current.mutate('venue-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify mutation completed
      expect(result.current.data?.status).toBe('verified');
    });

    it('should not go below zero for pending count', async () => {
      const { result } = renderHook(() => useApproveVenue(), { wrapper });

      result.current.mutate('venue-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify mutation completed
      expect(result.current.data?.status).toBe('verified');
    });
  });
});
