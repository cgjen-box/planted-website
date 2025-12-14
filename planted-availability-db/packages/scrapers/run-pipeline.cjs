#!/usr/bin/env node
/**
 * Quality Pipeline - Autonomous data improvement orchestrator
 *
 * Usage:
 *   node run-pipeline.cjs                    # Full pipeline (dry run)
 *   node run-pipeline.cjs --execute          # Full pipeline with updates
 *   node run-pipeline.cjs --quality-only     # Only check data quality
 *   node run-pipeline.cjs --learning-only    # Only run learning cycle
 *
 * Design principles:
 *   - Simple: One file, clear flow
 *   - Quality-first: Skip failing sources, verify before sync
 *   - Self-improving: Learn from results, adapt priorities
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Quality thresholds
const QUALITY_GATES = {
  MIN_SUCCESS_RATE: 15,      // Skip sources below this %
  MAX_ERROR_RATE: 40,        // Skip if errors exceed this %
  MIN_SAMPLES: 10,           // Need this many samples to decide
};

// Initialize Firebase
initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});

const db = getFirestore();

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');
const QUALITY_ONLY = args.includes('--quality-only');
const LEARNING_ONLY = args.includes('--learning-only');

/**
 * Step 1: Analyze sources and identify which ones are healthy
 */
async function analyzeSourceHealth() {
  console.log('\n=== Step 1: Source Health Analysis ===\n');

  const feedbackSnap = await db.collection('search_feedback').get();
  const bySource = {};

  feedbackSnap.docs.forEach(doc => {
    const d = doc.data();
    const key = `${d.platform}:${d.country}`;
    if (!bySource[key]) {
      bySource[key] = { total: 0, true_positive: 0, error: 0, no_results: 0 };
    }
    bySource[key].total++;
    bySource[key][d.result_type] = (bySource[key][d.result_type] || 0) + 1;
  });

  const healthy = [];
  const skip = [];

  for (const [source, stats] of Object.entries(bySource)) {
    const [platform, country] = source.split(':');
    const successRate = stats.total > 0 ? Math.round((stats.true_positive / stats.total) * 100) : 0;
    const errorRate = stats.total > 0 ? Math.round((stats.error / stats.total) * 100) : 0;

    const entry = { platform, country, successRate, errorRate, samples: stats.total };

    if (stats.total < QUALITY_GATES.MIN_SAMPLES) {
      healthy.push({ ...entry, reason: 'insufficient data (benefit of doubt)' });
    } else if (successRate < QUALITY_GATES.MIN_SUCCESS_RATE) {
      skip.push({ ...entry, reason: `low success rate (${successRate}%)` });
    } else if (errorRate > QUALITY_GATES.MAX_ERROR_RATE) {
      skip.push({ ...entry, reason: `high error rate (${errorRate}%)` });
    } else {
      healthy.push(entry);
    }
  }

  // Sort by success rate
  healthy.sort((a, b) => b.successRate - a.successRate);

  console.log('Healthy sources (will process):');
  healthy.slice(0, 10).forEach(s => {
    console.log(`  ✓ ${s.platform}/${s.country}: ${s.successRate}% success (n=${s.samples})`);
  });
  if (healthy.length > 10) console.log(`  ... and ${healthy.length - 10} more`);

  if (skip.length > 0) {
    console.log('\nSkipping (failed quality gates):');
    skip.forEach(s => {
      console.log(`  ✗ ${s.platform}/${s.country}: ${s.reason}`);
    });
  }

  return { healthy, skip };
}

/**
 * Step 2: Verify data quality of promoted venues
 */
async function verifyDataQuality() {
  console.log('\n=== Step 2: Data Quality Verification ===\n');

  const promotedSnap = await db.collection('discovered_venues')
    .where('status', '==', 'promoted')
    .get();

  console.log(`Checking ${promotedSnap.size} promoted venues...\n`);

  let venuesChecked = 0;
  let dishesValid = 0;
  let dishesInvalid = 0;
  const issuesByType = {};

  for (const doc of promotedSnap.docs) {
    const venue = doc.data();
    const dishes = venue.dishes || [];
    venuesChecked++;

    for (const dish of dishes) {
      const issues = [];

      // Check required fields
      if (!dish.name || dish.name.trim().length === 0) {
        issues.push('missing_name');
      }

      // Price can be: string ("€11.00"), number (11.00), or object ({ amount, currency })
      const hasValidPrice = (
        (typeof dish.price === 'string' && dish.price.length > 0) ||
        (typeof dish.price === 'number' && dish.price > 0) ||
        (typeof dish.price === 'object' && dish.price?.amount > 0)
      );
      if (!hasValidPrice) {
        issues.push('missing_or_invalid_price');
      }

      // Currency: separate field or embedded in price object
      const hasCurrency = dish.currency || (typeof dish.price === 'object' && dish.price?.currency);
      if (!hasCurrency) {
        issues.push('missing_currency');
      }

      if (issues.length === 0) {
        dishesValid++;
      } else {
        dishesInvalid++;
        issues.forEach(issue => {
          issuesByType[issue] = (issuesByType[issue] || 0) + 1;
        });
      }
    }
  }

  const total = dishesValid + dishesInvalid;
  const validRate = total > 0 ? Math.round((dishesValid / total) * 100) : 0;

  console.log(`Venues checked: ${venuesChecked}`);
  console.log(`Dishes valid: ${dishesValid}/${total} (${validRate}%)`);

  if (Object.keys(issuesByType).length > 0) {
    console.log('\nIssue breakdown:');
    Object.entries(issuesByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([issue, count]) => {
        console.log(`  ${issue}: ${count}`);
      });
  }

  return { venuesChecked, dishesValid, dishesInvalid, validRate, issues: issuesByType };
}

/**
 * Step 3: Run learning cycle
 */
async function runLearning() {
  console.log('\n=== Step 3: Learning Cycle ===\n');

  // Get reviewed feedback from last 7 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const feedbackSnap = await db.collection('search_feedback')
    .where('created_at', '>=', cutoff)
    .get();

  const reviewed = feedbackSnap.docs.filter(doc => doc.data().reviewed_at);
  console.log(`Feedback in last 7 days: ${reviewed.length} reviewed records`);

  if (reviewed.length < 10) {
    console.log('Not enough data for learning (need 10+)');
    return { feedback_analyzed: reviewed.length, updates: 0, insights: [] };
  }

  // Analyze by strategy
  const strategyStats = {};
  reviewed.forEach(doc => {
    const f = doc.data();
    const stratId = f.strategy_id || 'unknown';
    if (!strategyStats[stratId]) {
      strategyStats[stratId] = { total: 0, success: 0 };
    }
    strategyStats[stratId].total++;
    if (f.result_type === 'true_positive') {
      strategyStats[stratId].success++;
    }
  });

  // Generate insights and updates
  const insights = [];
  const updates = [];

  console.log('\nStrategy Performance:');
  for (const [stratId, stats] of Object.entries(strategyStats)) {
    if (stratId === 'claude-generated' || stratId === 'unknown') continue;
    if (stats.total < 5) continue;

    const successRate = Math.round((stats.success / stats.total) * 100);
    console.log(`  ${stratId}: ${successRate}% (n=${stats.total})`);

    // Determine tier change
    if (successRate >= 70) {
      insights.push({ stratId, action: 'promote', successRate, newTier: 1 });
    } else if (successRate < 20) {
      insights.push({ stratId, action: 'demote', successRate, newTier: 3 });
    }
  }

  // Apply updates
  console.log('\nLearning insights:');
  for (const insight of insights) {
    console.log(`  ${insight.action === 'promote' ? '↑' : '↓'} ${insight.stratId}: tier → ${insight.newTier} (${insight.successRate}%)`);

    if (!DRY_RUN) {
      try {
        await db.collection('discovery_strategies').doc(insight.stratId).update({
          tier: insight.newTier,
          success_rate: insight.successRate,
          updated_at: new Date(),
        });
        updates.push(insight);
      } catch (error) {
        console.log(`    ⚠ Could not update: ${error.message}`);
      }
    }
  }

  if (DRY_RUN && insights.length > 0) {
    console.log('\n[DRY RUN] Would apply these updates. Use --execute to apply.');
  }

  // Save learning record
  if (!DRY_RUN && insights.length > 0) {
    await db.collection('discovery_learning').add({
      created_at: new Date(),
      feedback_analyzed: reviewed.length,
      insights: insights,
      type: 'pipeline_learning',
    });
  }

  return { feedback_analyzed: reviewed.length, updates: updates.length, insights };
}

/**
 * Main pipeline
 */
async function runPipeline() {
  console.log('='.repeat(60));
  console.log('Quality Pipeline');
  console.log('='.repeat(60));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (analysis only)' : 'EXECUTE (will apply changes)'}`);
  console.log(`Time: ${new Date().toISOString()}`);

  const results = {
    started_at: new Date(),
    mode: DRY_RUN ? 'dry_run' : 'execute',
  };

  try {
    // Step 1: Source health (skip if learning only)
    if (!LEARNING_ONLY) {
      results.source_health = await analyzeSourceHealth();
    }

    // Step 2: Data quality (skip if learning only)
    if (!LEARNING_ONLY) {
      results.data_quality = await verifyDataQuality();
    }

    // Step 3: Learning (skip if quality only)
    if (!QUALITY_ONLY) {
      results.learning = await runLearning();
    }

    results.completed_at = new Date();
    results.duration_seconds = (results.completed_at - results.started_at) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('Pipeline Complete');
    console.log('='.repeat(60));
    console.log(`Duration: ${results.duration_seconds.toFixed(1)}s`);

    if (results.data_quality) {
      console.log(`Quality: ${results.data_quality.validRate}% dishes valid`);
    }
    if (results.learning) {
      console.log(`Learning: ${results.learning.updates} strategy updates`);
    }

    console.log('\n');
    process.exit(0);

  } catch (error) {
    console.error('\nPipeline failed:', error);
    process.exit(1);
  }
}

// Run
runPipeline();
