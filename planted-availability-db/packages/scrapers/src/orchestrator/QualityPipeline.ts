/**
 * Quality Pipeline - Simple orchestration for autonomous data improvement
 *
 * Design principles:
 * - Simple: One file, clear flow
 * - Quality-first: Skip failing sources, verify before sync
 * - Self-improving: Learn from results, adapt priorities
 * - Observable: Log everything, escalate issues
 */

import { initializeFirestore, searchFeedback, discoveryStrategies, discoveredVenues, discoveredDishes } from '@pad/database';
import type { DeliveryPlatform, SupportedCountry } from '@pad/core';

// Thresholds for quality gates
const QUALITY_GATES = {
  MIN_SUCCESS_RATE: 15,      // Skip platform/country below this %
  MAX_ERROR_RATE: 40,        // Skip if errors exceed this %
  MIN_FEEDBACK_FOR_SKIP: 10, // Need at least this many samples to make decision
};

interface PipelineConfig {
  dryRun?: boolean;
  maxVenues?: number;
  verbose?: boolean;
  skipDiscovery?: boolean;
  skipExtraction?: boolean;
  skipLearning?: boolean;
}

interface PipelineResult {
  started_at: Date;
  completed_at: Date;
  discovery: {
    venues_found: number;
    queries_executed: number;
    skipped_sources: string[];
  };
  extraction: {
    venues_processed: number;
    dishes_found: number;
    errors: number;
  };
  learning: {
    feedback_analyzed: number;
    insights_generated: number;
    strategies_updated: number;
  };
  quality: {
    venues_verified: number;
    dishes_valid: number;
    dishes_invalid: number;
  };
}

/**
 * Quality Pipeline - Orchestrates discovery, extraction, verification, and learning
 */
export class QualityPipeline {
  private config: Required<PipelineConfig>;
  private db: FirebaseFirestore.Firestore | null = null;

  constructor(config: PipelineConfig = {}) {
    this.config = {
      dryRun: config.dryRun ?? false,
      maxVenues: config.maxVenues ?? 50,
      verbose: config.verbose ?? true,
      skipDiscovery: config.skipDiscovery ?? false,
      skipExtraction: config.skipExtraction ?? false,
      skipLearning: config.skipLearning ?? false,
    };
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[Pipeline] ${message}`);
    }
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    initializeFirestore();
    this.log('Initialized database connection');
  }

  /**
   * Get sources (platform+country combos) that pass quality gates
   */
  async getHealthySources(): Promise<Array<{ platform: DeliveryPlatform; country: SupportedCountry; successRate: number }>> {
    const feedbackStats = await this.analyzeFeedbackBySource();
    const healthy: Array<{ platform: DeliveryPlatform; country: SupportedCountry; successRate: number }> = [];
    const skipped: string[] = [];

    for (const [key, stats] of Object.entries(feedbackStats)) {
      const [platform, country] = key.split(':') as [DeliveryPlatform, SupportedCountry];

      // Skip if not enough data to make decision
      if (stats.total < QUALITY_GATES.MIN_FEEDBACK_FOR_SKIP) {
        healthy.push({ platform, country, successRate: 50 }); // Give benefit of doubt
        continue;
      }

      const successRate = Math.round((stats.true_positive / stats.total) * 100);
      const errorRate = Math.round((stats.error / stats.total) * 100);

      if (successRate < QUALITY_GATES.MIN_SUCCESS_RATE) {
        skipped.push(`${platform}/${country} (${successRate}% success)`);
        continue;
      }

      if (errorRate > QUALITY_GATES.MAX_ERROR_RATE) {
        skipped.push(`${platform}/${country} (${errorRate}% errors)`);
        continue;
      }

      healthy.push({ platform, country, successRate });
    }

    if (skipped.length > 0) {
      this.log(`Skipping low-quality sources: ${skipped.join(', ')}`);
    }

    // Sort by success rate (best first)
    return healthy.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Analyze feedback grouped by platform+country
   */
  private async analyzeFeedbackBySource(): Promise<Record<string, { total: number; true_positive: number; error: number }>> {
    const stats = await searchFeedback.getStats();
    const result: Record<string, { total: number; true_positive: number; error: number }> = {};

    // Get detailed breakdown
    const allFeedback = await searchFeedback.getAll();

    for (const f of allFeedback) {
      const key = `${f.platform}:${f.country}`;
      if (!result[key]) {
        result[key] = { total: 0, true_positive: 0, error: 0 };
      }
      result[key].total++;
      if (f.result_type === 'true_positive') result[key].true_positive++;
      if (f.result_type === 'error') result[key].error++;
    }

    return result;
  }

  /**
   * Get top strategies for discovery
   */
  async getTopStrategies(limit: number = 10): Promise<string[]> {
    const allStrategies = await discoveryStrategies.getAll();

    // Sort by success rate, filter out poor performers
    const sorted = allStrategies
      .filter(s => (s.success_rate || 0) >= QUALITY_GATES.MIN_SUCCESS_RATE)
      .sort((a, b) => (b.success_rate || 0) - (a.success_rate || 0));

    return sorted.slice(0, limit).map(s => s.id);
  }

  /**
   * Verify dish data quality
   */
  validateDish(dish: { name?: string; price?: { amount?: number; currency?: string } }): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!dish.name || dish.name.trim().length === 0) {
      issues.push('missing name');
    }

    if (!dish.price) {
      issues.push('missing price');
    } else {
      if (typeof dish.price.amount !== 'number' || dish.price.amount <= 0) {
        issues.push('invalid price amount');
      }
      if (!dish.price.currency || dish.price.currency.length !== 3) {
        issues.push('invalid currency');
      }
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Run learning cycle
   */
  async runLearning(): Promise<{ feedback_analyzed: number; insights: number; updates: number }> {
    this.log('Running learning cycle...');

    // Get reviewed feedback from last 7 days
    const recentFeedback = await searchFeedback.getForLearning(7);

    if (recentFeedback.length < 10) {
      this.log('Not enough feedback for learning (need 10+)');
      return { feedback_analyzed: recentFeedback.length, insights: 0, updates: 0 };
    }

    // Analyze by strategy
    const strategyStats: Record<string, { total: number; success: number }> = {};
    for (const f of recentFeedback) {
      const stratId = f.strategy_id || 'unknown';
      if (!strategyStats[stratId]) {
        strategyStats[stratId] = { total: 0, success: 0 };
      }
      strategyStats[stratId].total++;
      if (f.result_type === 'true_positive') {
        strategyStats[stratId].success++;
      }
    }

    // Update strategy tiers based on performance
    let updates = 0;
    const insights: string[] = [];

    for (const [stratId, stats] of Object.entries(strategyStats)) {
      if (stratId === 'claude-generated' || stratId === 'unknown') continue;
      if (stats.total < 5) continue; // Need enough samples

      const successRate = Math.round((stats.success / stats.total) * 100);

      try {
        const strategy = await discoveryStrategies.getById(stratId);
        if (!strategy) continue;

        let newTier = strategy.tier || 2;
        if (successRate >= 70 && newTier > 1) {
          newTier = 1; // Promote to top tier
          insights.push(`Promoted ${stratId} to tier 1 (${successRate}% success)`);
        } else if (successRate < 20 && newTier < 3) {
          newTier = 3; // Demote to lowest tier
          insights.push(`Demoted ${stratId} to tier 3 (${successRate}% success)`);
        }

        if (newTier !== strategy.tier && !this.config.dryRun) {
          await discoveryStrategies.update(stratId, {
            tier: newTier,
            success_rate: successRate,
          });
          updates++;
        }
      } catch (error) {
        // Strategy might not exist, skip
      }
    }

    for (const insight of insights) {
      this.log(insight);
    }

    return {
      feedback_analyzed: recentFeedback.length,
      insights: insights.length,
      updates,
    };
  }

  /**
   * Run the full pipeline
   */
  async run(): Promise<PipelineResult> {
    const startTime = new Date();
    this.log(`Starting Quality Pipeline (dryRun: ${this.config.dryRun})`);

    await this.initialize();

    const result: PipelineResult = {
      started_at: startTime,
      completed_at: new Date(),
      discovery: { venues_found: 0, queries_executed: 0, skipped_sources: [] },
      extraction: { venues_processed: 0, dishes_found: 0, errors: 0 },
      learning: { feedback_analyzed: 0, insights_generated: 0, strategies_updated: 0 },
      quality: { venues_verified: 0, dishes_valid: 0, dishes_invalid: 0 },
    };

    // Step 1: Get healthy sources
    this.log('\n=== Step 1: Quality Gates ===');
    const healthySources = await this.getHealthySources();
    this.log(`${healthySources.length} healthy platform/country combinations`);

    // Step 2: Discovery (if not skipped)
    if (!this.config.skipDiscovery) {
      this.log('\n=== Step 2: Discovery ===');
      this.log('(Discovery agent integration - run separately via: pnpm run discover)');
      // Note: SmartDiscoveryAgent is complex and runs separately
      // This pipeline coordinates and verifies, doesn't replace the agent
    }

    // Step 3: Verify existing data quality
    this.log('\n=== Step 3: Quality Verification ===');
    const promotedVenues = await discoveredVenues.getByStatus('promoted');
    this.log(`Checking ${promotedVenues.length} promoted venues...`);

    for (const venue of promotedVenues.slice(0, this.config.maxVenues)) {
      result.quality.venues_verified++;

      const dishes = venue.dishes || [];
      for (const dish of dishes) {
        const validation = this.validateDish(dish);
        if (validation.valid) {
          result.quality.dishes_valid++;
        } else {
          result.quality.dishes_invalid++;
          if (this.config.verbose) {
            this.log(`  Invalid dish in ${venue.name}: ${validation.issues.join(', ')}`);
          }
        }
      }
    }

    this.log(`Verified: ${result.quality.dishes_valid} valid, ${result.quality.dishes_invalid} invalid dishes`);

    // Step 4: Learning
    if (!this.config.skipLearning) {
      this.log('\n=== Step 4: Learning ===');
      const learningResult = await this.runLearning();
      result.learning = {
        feedback_analyzed: learningResult.feedback_analyzed,
        insights_generated: learningResult.insights,
        strategies_updated: learningResult.updates,
      };
    }

    // Complete
    result.completed_at = new Date();
    const duration = (result.completed_at.getTime() - result.started_at.getTime()) / 1000;

    this.log('\n=== Pipeline Complete ===');
    this.log(`Duration: ${duration.toFixed(1)}s`);
    this.log(`Quality: ${result.quality.dishes_valid}/${result.quality.dishes_valid + result.quality.dishes_invalid} dishes valid`);
    this.log(`Learning: ${result.learning.strategies_updated} strategy updates`);

    return result;
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = !args.includes('--quiet');
  const skipLearning = args.includes('--skip-learning');

  const pipeline = new QualityPipeline({
    dryRun,
    verbose,
    skipLearning,
    maxVenues: 100,
  });

  pipeline.run()
    .then(result => {
      console.log('\nResult:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Pipeline failed:', error);
      process.exit(1);
    });
}
