/**
 * useStrategyStats Hook
 *
 * Fetches strategy performance statistics for the reinforcement learning system.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface StrategyStats {
  total_strategies: number;
  active_strategies: number;
  deprecated_strategies: number;
  average_success_rate: number;
  total_uses: number;
  total_discoveries: number;
  total_false_positives: number;
  recently_used_count: number;
  tiers: {
    high: number;
    medium: number;
    low: number;
    untested: number;
  };
  by_origin: {
    seed: number;
    evolved: number;
    manual: number;
    agent: number;
  };
  by_platform: Record<string, number>;
  by_country: Record<string, number>;
}

interface TopStrategy {
  id: string;
  query_template: string;
  platform: string;
  country: string;
  success_rate: number;
  total_uses: number;
  successful_discoveries: number;
}

interface StrugglingStrategy {
  id: string;
  query_template: string;
  platform: string;
  country: string;
  success_rate: number;
  total_uses: number;
  false_positives: number;
}

interface StrategyStatsResponse {
  success: boolean;
  stats: StrategyStats;
  top_strategies: TopStrategy[];
  struggling_strategies: StrugglingStrategy[];
}

async function getStrategyStats(): Promise<StrategyStatsResponse> {
  return apiClient.get<StrategyStatsResponse>('/adminStrategyStats');
}

/**
 * Hook to fetch strategy performance statistics
 */
export function useStrategyStats(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: ['strategyStats'],
    queryFn: getStrategyStats,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled ?? true,
  });
}
