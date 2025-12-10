/**
 * useReviewQueue Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient } from '@/test/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import { useReviewQueue } from '../useReviewQueue';
import type { ReviewQueueFilters } from '../../types';

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

describe('useReviewQueue', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should fetch review queue successfully', async () => {
    const { result } = renderHook(() => useReviewQueue(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.items).toBeInstanceOf(Array);
  });

  it('should fetch with country filter', async () => {
    const filters: ReviewQueueFilters = { country: 'CH' };
    const { result } = renderHook(() => useReviewQueue(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const items = result.current.data?.items || [];
    items.forEach(item => {
      expect(item.country).toBe('CH');
    });
  });

  it('should fetch with status filter', async () => {
    const filters: ReviewQueueFilters = { status: 'discovered' };
    const { result } = renderHook(() => useReviewQueue(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const items = result.current.data?.items || [];
    items.forEach(item => {
      expect(item.status).toBe('discovered');
    });
  });

  it('should return hierarchy data', async () => {
    const { result } = renderHook(() => useReviewQueue(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.hierarchy).toBeDefined();
    expect(result.current.data?.hierarchy).toBeInstanceOf(Array);
  });

  it('should return stats data', async () => {
    const { result } = renderHook(() => useReviewQueue(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.stats).toBeDefined();
    expect(result.current.data?.stats.pending).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.stats.verified).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.stats.rejected).toBeGreaterThanOrEqual(0);
  });

  it('should be disabled when enabled option is false', async () => {
    const { result } = renderHook(
      () => useReviewQueue({}, { enabled: false }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should use correct query key for caching', () => {
    const filters: ReviewQueueFilters = { country: 'CH', status: 'verified' };
    const { result: result1 } = renderHook(() => useReviewQueue(filters), { wrapper });
    const { result: result2 } = renderHook(() => useReviewQueue(filters), { wrapper });

    // Both should use the same query key and share cache
    expect(result1.current.dataUpdatedAt).toBe(result2.current.dataUpdatedAt);
  });

  it('should refetch when filters change', async () => {
    const { result, rerender } = renderHook(
      ({ filters }: { filters: ReviewQueueFilters }) => useReviewQueue(filters),
      {
        wrapper,
        initialProps: { filters: { country: 'CH' } },
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const firstData = result.current.data;

    // Change filters
    rerender({ filters: { country: 'DE' } });

    await waitFor(() => {
      expect(result.current.data).not.toBe(firstData);
    });
  });

  it('should support pagination', async () => {
    const filters: ReviewQueueFilters = { page: 1, pageSize: 10 };
    const { result } = renderHook(() => useReviewQueue(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pagination).toBeDefined();
    expect(result.current.data?.pagination.page).toBe(1);
    expect(result.current.data?.pagination.pageSize).toBe(10);
  });

  it('should handle search filter', async () => {
    const filters: ReviewQueueFilters = { search: 'Tibits' };
    const { result } = renderHook(() => useReviewQueue(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should handle confidence range filters', async () => {
    const filters: ReviewQueueFilters = {
      minConfidence: 0.8,
      maxConfidence: 1.0,
    };
    const { result } = renderHook(() => useReviewQueue(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });

  it('should support auto-refresh with refetchInterval', async () => {
    const { result } = renderHook(
      () => useReviewQueue({}, { refetchInterval: 1000 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const firstFetchTime = result.current.dataUpdatedAt;

    // Wait for refetch
    await new Promise(resolve => setTimeout(resolve, 1100));

    await waitFor(() => {
      expect(result.current.dataUpdatedAt).toBeGreaterThan(firstFetchTime);
    });
  });
});
