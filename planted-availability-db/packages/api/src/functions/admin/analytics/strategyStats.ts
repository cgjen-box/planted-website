/**
 * Admin Strategy Stats API
 * GET /adminStrategyStats
 *
 * Returns aggregated strategy performance metrics for the reinforcement learning system:
 * - Average success rate across active strategies
 * - Top/bottom performing strategies
 * - Strategy counts by tier
 * - Usage trends
 */

import {
  initializeFirestore,
  discoveryStrategies,
} from '@pad/database';
import { createAdminHandler } from '../../../middleware/adminHandler.js';

// Initialize Firestore
initializeFirestore();

/**
 * Handler for GET /adminStrategyStats
 */
export const adminStrategyStatsHandler = createAdminHandler(
  async (req, res) => {
    // Get all strategies and tier breakdown
    const [allStrategies, tiers] = await Promise.all([
      discoveryStrategies.getAll(),
      discoveryStrategies.getStrategyTiers(),
    ]);

    // Filter to active strategies only
    const activeStrategies = allStrategies.filter(s => !s.deprecated_at);
    const deprecatedCount = allStrategies.length - activeStrategies.length;

    // Calculate average success rate (weighted by usage)
    let totalWeightedSuccess = 0;
    let totalWeight = 0;
    for (const strategy of activeStrategies) {
      if (strategy.total_uses > 0) {
        totalWeightedSuccess += strategy.success_rate * strategy.total_uses;
        totalWeight += strategy.total_uses;
      }
    }
    const averageSuccessRate = totalWeight > 0
      ? Math.round(totalWeightedSuccess / totalWeight)
      : 0;

    // Get top performing strategies (min 5 uses, sorted by success rate)
    const topStrategies = activeStrategies
      .filter(s => s.total_uses >= 5)
      .sort((a, b) => b.success_rate - a.success_rate)
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        query_template: s.query_template,
        platform: s.platform,
        country: s.country,
        success_rate: s.success_rate,
        total_uses: s.total_uses,
        successful_discoveries: s.successful_discoveries,
      }));

    // Get struggling strategies (min 5 uses, success rate < 50%)
    const strugglingStrategies = activeStrategies
      .filter(s => s.total_uses >= 5 && s.success_rate < 50)
      .sort((a, b) => a.success_rate - b.success_rate)
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        query_template: s.query_template,
        platform: s.platform,
        country: s.country,
        success_rate: s.success_rate,
        total_uses: s.total_uses,
        false_positives: s.false_positives,
      }));

    // Calculate total discoveries and false positives
    let totalDiscoveries = 0;
    let totalFalsePositives = 0;
    let totalUses = 0;
    for (const strategy of activeStrategies) {
      totalDiscoveries += strategy.successful_discoveries;
      totalFalsePositives += strategy.false_positives;
      totalUses += strategy.total_uses;
    }

    // Strategy counts by origin
    const byOrigin = {
      seed: activeStrategies.filter(s => s.origin === 'seed').length,
      evolved: activeStrategies.filter(s => s.origin === 'evolved').length,
      manual: activeStrategies.filter(s => s.origin === 'manual').length,
      agent: activeStrategies.filter(s => s.origin === 'agent').length,
    };

    // Strategy counts by platform
    const byPlatform: Record<string, number> = {};
    for (const strategy of activeStrategies) {
      byPlatform[strategy.platform] = (byPlatform[strategy.platform] || 0) + 1;
    }

    // Strategy counts by country
    const byCountry: Record<string, number> = {};
    for (const strategy of activeStrategies) {
      byCountry[strategy.country] = (byCountry[strategy.country] || 0) + 1;
    }

    // Find recently used strategies (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyUsed = activeStrategies.filter(
      s => s.last_used && s.last_used >= sevenDaysAgo
    ).length;

    res.json({
      success: true,
      stats: {
        // Overall metrics
        total_strategies: allStrategies.length,
        active_strategies: activeStrategies.length,
        deprecated_strategies: deprecatedCount,
        average_success_rate: averageSuccessRate,
        total_uses: totalUses,
        total_discoveries: totalDiscoveries,
        total_false_positives: totalFalsePositives,
        recently_used_count: recentlyUsed,

        // Tier breakdown
        tiers: {
          high: tiers.high.length,
          medium: tiers.medium.length,
          low: tiers.low.length,
          untested: tiers.untested.length,
        },

        // Distribution
        by_origin: byOrigin,
        by_platform: byPlatform,
        by_country: byCountry,
      },

      // Top/bottom performers
      top_strategies: topStrategies,
      struggling_strategies: strugglingStrategies,
    });
  },
  { allowedMethods: ['GET'] }
);
