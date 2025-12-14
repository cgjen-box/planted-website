#!/usr/bin/env node
/**
 * Diagnostic: Check Reinforcement Learning System Status
 * Checks feedback, strategies, and learning infrastructure
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Initialize Firebase with service account
initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});

const db = getFirestore();

async function checkRLStatus() {
  console.log('=== RL System Diagnostic ===\n');

  // 1. Check search_feedback collection
  console.log('1. SEARCH FEEDBACK');
  console.log('-------------------');
  const feedbackSnap = await db.collection('search_feedback').get();
  console.log(`   Total feedback records: ${feedbackSnap.size}`);

  if (feedbackSnap.size > 0) {
    // Get most recent
    const recentSnap = await db.collection('search_feedback')
      .orderBy('created_at', 'desc')
      .limit(5)
      .get();

    console.log('\n   Most recent feedback:');
    recentSnap.docs.forEach(doc => {
      const d = doc.data();
      const date = d.created_at?.toDate?.() || 'unknown';
      console.log(`   - ${date}: ${d.query} (${d.platform}/${d.country}) → ${d.result_type}`);
    });

    // Count by result type
    const byType = {};
    feedbackSnap.docs.forEach(doc => {
      const type = doc.data().result_type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    console.log('\n   By result type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    // Check reviewed count
    let reviewed = 0;
    feedbackSnap.docs.forEach(doc => {
      if (doc.data().reviewed_at) reviewed++;
    });
    console.log(`\n   Reviewed: ${reviewed}/${feedbackSnap.size} (${Math.round(reviewed/feedbackSnap.size*100)}%)`);
  }

  // 2. Check discovery_strategies collection
  console.log('\n\n2. DISCOVERY STRATEGIES');
  console.log('------------------------');
  const strategiesSnap = await db.collection('discovery_strategies').get();
  console.log(`   Total strategies: ${strategiesSnap.size}`);

  if (strategiesSnap.size > 0) {
    // Sample strategies
    console.log('\n   Sample strategies:');
    strategiesSnap.docs.slice(0, 5).forEach(doc => {
      const d = doc.data();
      console.log(`   - ${d.query_template} (${d.platform}/${d.country}) tier:${d.tier} success:${d.success_rate}%`);
    });

    // By tier
    const byTier = {};
    strategiesSnap.docs.forEach(doc => {
      const tier = doc.data().tier || 'unknown';
      byTier[tier] = (byTier[tier] || 0) + 1;
    });
    console.log('\n   By tier:');
    Object.entries(byTier).forEach(([tier, count]) => {
      console.log(`   - ${tier}: ${count}`);
    });
  }

  // 3. Check discovery_runs collection (to see if system is being used)
  console.log('\n\n3. DISCOVERY RUNS');
  console.log('------------------');
  const runsSnap = await db.collection('discovery_runs')
    .orderBy('created_at', 'desc')
    .limit(5)
    .get();
  console.log(`   Recent runs (last 5):`);

  if (runsSnap.size > 0) {
    runsSnap.docs.forEach(doc => {
      const d = doc.data();
      const date = d.created_at?.toDate?.() || 'unknown';
      console.log(`   - ${date}: ${d.status} | queries:${d.stats?.total_queries || 0} venues:${d.stats?.venues_discovered || 0}`);
    });
  } else {
    console.log('   No runs found');
  }

  // 4. Check learning data (if any patterns were learned)
  console.log('\n\n4. LEARNED PATTERNS');
  console.log('--------------------');
  const patternsSnap = await db.collection('discovery_learning').get();
  console.log(`   Total learned patterns: ${patternsSnap.size}`);

  if (patternsSnap.size > 0) {
    console.log('\n   Recent patterns:');
    patternsSnap.docs.slice(0, 5).forEach(doc => {
      const d = doc.data();
      console.log(`   - ${d.type}: ${d.description || JSON.stringify(d).slice(0, 80)}`);
    });
  }

  // 5. Summary diagnosis
  console.log('\n\n=== DIAGNOSIS ===\n');

  const issues = [];
  const healthy = [];

  if (feedbackSnap.size === 0) {
    issues.push('❌ No feedback data - searches are not recording results');
  } else if (feedbackSnap.size < 10) {
    issues.push('⚠️  Only ' + feedbackSnap.size + ' feedback records - need 10+ for learning');
  } else {
    healthy.push('✓ Feedback data exists (' + feedbackSnap.size + ' records)');
  }

  if (strategiesSnap.size === 0) {
    issues.push('❌ No strategies defined - discovery has no queries to run');
  } else {
    healthy.push('✓ Strategies defined (' + strategiesSnap.size + ' strategies)');
  }

  if (runsSnap.size === 0) {
    issues.push('❌ No discovery runs - system has never been executed');
  } else {
    healthy.push('✓ Discovery runs exist');
  }

  // Check if feedback is being reviewed
  let reviewedCount = 0;
  feedbackSnap.docs.forEach(doc => {
    if (doc.data().reviewed_at) reviewedCount++;
  });

  if (feedbackSnap.size > 0 && reviewedCount === 0) {
    issues.push('⚠️  No feedback has been reviewed - learning loop cannot run');
  } else if (reviewedCount > 0) {
    healthy.push('✓ Some feedback reviewed (' + reviewedCount + ' records)');
  }

  if (patternsSnap.size === 0 && feedbackSnap.size > 10) {
    issues.push('⚠️  No learned patterns despite having feedback - learn() may not be running');
  } else if (patternsSnap.size > 0) {
    healthy.push('✓ Patterns have been learned (' + patternsSnap.size + ')');
  }

  console.log('Healthy:');
  healthy.forEach(h => console.log('  ' + h));

  if (issues.length > 0) {
    console.log('\nIssues to fix:');
    issues.forEach(i => console.log('  ' + i));
  } else {
    console.log('\n✓ All systems operational!');
  }

  console.log('\n');
  process.exit(0);
}

checkRLStatus().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
