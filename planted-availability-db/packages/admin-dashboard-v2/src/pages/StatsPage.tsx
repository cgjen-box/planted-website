/**
 * Stats Page
 *
 * Tab 3 of the minimal admin dashboard.
 * Shows budget usage, approval metrics, and strategy learning performance.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { LoadingState } from '@/shared/components/LoadingState';
import { ErrorState } from '@/shared/components/ErrorState';
import { useBudget } from '@/features/scraping/hooks/useBudget';
import { useReviewQueue } from '@/features/review/hooks/useReviewQueue';
import { useStrategyStats } from '@/hooks/useStrategyStats';
import { BudgetStatus } from '@/features/scraping/components/BudgetStatus';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  Activity,
} from 'lucide-react';

/**
 * Stats Page Component
 */
export function StatsPage() {
  const { data: budget, isLoading: budgetLoading, error: budgetError, refetch: refetchBudget } = useBudget();
  const { data: queueData, isLoading: queueLoading } = useReviewQueue({});
  const { data: strategyData, isLoading: strategyLoading, error: strategyError, refetch: refetchStrategy } = useStrategyStats();

  const isLoading = budgetLoading || queueLoading || strategyLoading;
  const hasError = budgetError || strategyError;

  if (isLoading) {
    return <LoadingState message="Loading statistics..." />;
  }

  if (hasError) {
    return (
      <ErrorState
        error={budgetError || strategyError || new Error('Failed to load stats')}
        onRetry={() => {
          refetchBudget();
          refetchStrategy();
        }}
      />
    );
  }

  const stats = queueData?.stats;
  const strategyStats = strategyData?.stats;
  const topStrategies = strategyData?.top_strategies || [];
  const strugglingStrategies = strategyData?.struggling_strategies || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Statistics</h1>
        <p className="text-muted-foreground">
          Budget usage, approval metrics, and reinforcement learning performance
        </p>
      </div>

      {/* Top Row: Budget + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Status */}
        {budget && <BudgetStatus budget={budget} />}

        {/* Today's Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {stats?.pending || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats?.verified || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold text-red-600">
                  {stats?.rejected || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Promoted</p>
                <p className="text-3xl font-bold text-blue-600">
                  {stats?.promoted || 0}
                </p>
              </div>
            </div>

            {/* Flagged Stats */}
            {stats?.flagged && stats.flagged.total > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Flagged for Priority</p>
                <div className="flex gap-4">
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Dish Extraction: {stats.flagged.dish_extraction}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Target className="h-3 w-3" />
                    Re-verification: {stats.flagged.re_verification}
                  </Badge>
                </div>
              </div>
            )}

            {/* By Country */}
            {stats?.byCountry && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">By Country</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byCountry).map(([country, count]) => (
                    <Badge key={country} variant="secondary">
                      {country}: {count as number}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Strategy Learning Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Strategy Learning Performance
          </CardTitle>
          <CardDescription>
            Reinforcement learning metrics for discovery strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Avg Success Rate</p>
              <p className="text-3xl font-bold">
                {strategyStats?.average_success_rate || 0}%
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Uses</p>
              <p className="text-3xl font-bold">
                {strategyStats?.total_uses?.toLocaleString() || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Discoveries</p>
              <p className="text-3xl font-bold text-green-600">
                {strategyStats?.total_discoveries?.toLocaleString() || 0}
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">False Positives</p>
              <p className="text-3xl font-bold text-red-600">
                {strategyStats?.total_false_positives?.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Strategy Tiers */}
          {strategyStats?.tiers && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Strategy Tiers</p>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-100 dark:bg-green-950 rounded-lg">
                  <p className="text-xs text-muted-foreground">High (70%+)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {strategyStats.tiers.high}
                  </p>
                </div>
                <div className="text-center p-3 bg-yellow-100 dark:bg-yellow-950 rounded-lg">
                  <p className="text-xs text-muted-foreground">Medium (40-69%)</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {strategyStats.tiers.medium}
                  </p>
                </div>
                <div className="text-center p-3 bg-red-100 dark:bg-red-950 rounded-lg">
                  <p className="text-xs text-muted-foreground">Low (&lt;40%)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {strategyStats.tiers.low}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-muted-foreground">Untested</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {strategyStats.tiers.untested}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top/Struggling Strategies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            {/* Top Strategies */}
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Top Performing Strategies
              </p>
              {topStrategies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {topStrategies.slice(0, 5).map((strategy) => (
                    <div
                      key={strategy.id}
                      className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {strategy.query_template}
                        </span>
                        <Badge variant="success" className="shrink-0">
                          {strategy.success_rate}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{strategy.platform}</span>
                        <span>|</span>
                        <span>{strategy.country}</span>
                        <span>|</span>
                        <span>{strategy.total_uses} uses</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Struggling Strategies */}
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Struggling Strategies
              </p>
              {strugglingStrategies.length === 0 ? (
                <p className="text-sm text-muted-foreground">All strategies performing well!</p>
              ) : (
                <div className="space-y-2">
                  {strugglingStrategies.slice(0, 5).map((strategy) => (
                    <div
                      key={strategy.id}
                      className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {strategy.query_template}
                        </span>
                        <Badge variant="destructive" className="shrink-0">
                          {strategy.success_rate}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{strategy.platform}</span>
                        <span>|</span>
                        <span>{strategy.country}</span>
                        <span>|</span>
                        <span>{strategy.false_positives} false positives</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Strategy Distribution */}
          {strategyStats?.by_origin && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Strategy Origins</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Seed: {strategyStats.by_origin.seed}
                </Badge>
                <Badge variant="outline">
                  Evolved: {strategyStats.by_origin.evolved}
                </Badge>
                <Badge variant="outline">
                  Manual: {strategyStats.by_origin.manual}
                </Badge>
                <Badge variant="outline">
                  Agent: {strategyStats.by_origin.agent}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                Active Strategies: {strategyStats?.active_strategies || 0}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                Deprecated: {strategyStats?.deprecated_strategies || 0}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                Recently Used (7d): {strategyStats?.recently_used_count || 0}
              </span>
            </div>
            <span className="text-muted-foreground">
              Total Venues in Queue: {stats?.total || 0}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
