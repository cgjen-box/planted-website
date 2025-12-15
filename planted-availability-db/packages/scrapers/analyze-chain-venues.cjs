#!/usr/bin/env node
/**
 * Analyze Chain Venues
 *
 * Query database to understand which chains need dish discovery vs dish copying.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function analyzeChainVenues() {
  console.log('Fetching all venues from production...\n');

  const venuesSnap = await db.collection('venues').get();
  const allVenues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log('Fetching all dishes...\n');
  const dishesSnap = await db.collection('dishes').get();
  const dishesByVenue = {};
  dishesSnap.docs.forEach(doc => {
    const dish = doc.data();
    if (!dishesByVenue[dish.venue_id]) {
      dishesByVenue[dish.venue_id] = [];
    }
    dishesByVenue[dish.venue_id].push({ id: doc.id, ...dish });
  });

  // Group venues by chain_id
  const chainGroups = {};
  const noChainVenues = [];

  allVenues.forEach(venue => {
    const chainId = venue.chain_id;
    const dishCount = dishesByVenue[venue.id]?.length || 0;

    const venueData = {
      id: venue.id,
      name: venue.name,
      city: venue.address?.city || venue.city,
      country: venue.address?.country || venue.country,
      dishCount,
      platforms: {
        uber_eats: venue.uber_eats_url || null,
        wolt: venue.wolt_url || null,
        lieferando: venue.lieferando_url || null,
        just_eat: venue.just_eat_url || null,
      }
    };

    if (chainId) {
      if (!chainGroups[chainId]) {
        chainGroups[chainId] = {
          chainId,
          chainName: venue.chain_name || venue.name,
          venues: [],
          withDishes: 0,
          withoutDishes: 0,
        };
      }
      chainGroups[chainId].venues.push(venueData);
      if (dishCount > 0) {
        chainGroups[chainId].withDishes++;
      } else {
        chainGroups[chainId].withoutDishes++;
      }
    } else {
      noChainVenues.push(venueData);
    }
  });

  // Sort chain groups by total venues
  const sortedChains = Object.values(chainGroups).sort((a, b) => b.venues.length - a.venues.length);

  console.log('='.repeat(80));
  console.log('CHAIN VENUE ANALYSIS');
  console.log('='.repeat(80));
  console.log();

  console.log('SUMMARY:');
  console.log('-'.repeat(80));
  console.log(`Total venues: ${allVenues.length}`);
  console.log(`Total chains: ${sortedChains.length}`);
  console.log(`Chain venues: ${allVenues.length - noChainVenues.length}`);
  console.log(`Non-chain venues: ${noChainVenues.length}`);
  console.log();

  // Find chains with mixed state (some with dishes, some without)
  const chainsNeedingCopy = sortedChains.filter(c => c.withDishes > 0 && c.withoutDishes > 0);
  const chainsNeedingDiscovery = sortedChains.filter(c => c.withDishes === 0);
  const chainsComplete = sortedChains.filter(c => c.withoutDishes === 0);

  console.log('CHAINS BY STATUS:');
  console.log('-'.repeat(80));
  console.log(`Complete (all venues have dishes): ${chainsComplete.length} chains`);
  console.log(`Ready to copy (have source dishes): ${chainsNeedingCopy.length} chains`);
  console.log(`Need discovery (no source dishes): ${chainsNeedingDiscovery.length} chains`);
  console.log();

  if (chainsComplete.length > 0) {
    console.log('COMPLETE CHAINS (all venues have dishes):');
    console.log('-'.repeat(80));
    chainsComplete.forEach(chain => {
      console.log(`  ${chain.chainName}: ${chain.venues.length} venues`);
    });
    console.log();
  }

  if (chainsNeedingCopy.length > 0) {
    console.log('CHAINS READY TO COPY (have source dishes):');
    console.log('-'.repeat(80));
    chainsNeedingCopy.forEach(chain => {
      const sourceVenue = chain.venues.find(v => v.dishCount > 0);
      console.log(`  ${chain.chainName}: ${chain.withoutDishes} venues need dishes (have ${chain.withDishes} source venues)`);
      console.log(`    Source: ${sourceVenue.name} (${sourceVenue.city}) - ${sourceVenue.dishCount} dishes`);
    });
    console.log();
  }

  if (chainsNeedingDiscovery.length > 0) {
    console.log('CHAINS NEEDING DISCOVERY (no source dishes):');
    console.log('-'.repeat(80));
    chainsNeedingDiscovery.forEach(chain => {
      console.log(`  ${chain.chainName}: ${chain.venues.length} venues, 0 dishes`);
      // Show sample venue with platform URLs
      const sampleVenue = chain.venues.find(v =>
        v.platforms.uber_eats || v.platforms.wolt || v.platforms.lieferando || v.platforms.just_eat
      ) || chain.venues[0];
      console.log(`    Sample: ${sampleVenue.name} (${sampleVenue.city})`);
      if (sampleVenue.platforms.uber_eats) console.log(`      Uber Eats: ${sampleVenue.platforms.uber_eats}`);
      if (sampleVenue.platforms.wolt) console.log(`      Wolt: ${sampleVenue.platforms.wolt}`);
      if (sampleVenue.platforms.lieferando) console.log(`      Lieferando: ${sampleVenue.platforms.lieferando}`);
      if (sampleVenue.platforms.just_eat) console.log(`      Just Eat: ${sampleVenue.platforms.just_eat}`);
    });
    console.log();
  }

  // Output totals
  const totalVenuesNeedingCopy = chainsNeedingCopy.reduce((sum, c) => sum + c.withoutDishes, 0);
  const totalVenuesNeedingDiscovery = chainsNeedingDiscovery.reduce((sum, c) => sum + c.venues.length, 0);

  console.log('='.repeat(80));
  console.log('ACTION PLAN:');
  console.log('='.repeat(80));
  console.log();
  console.log('QUICK WINS (Copy from source venues):');
  console.log(`  ${chainsNeedingCopy.length} chains, ${totalVenuesNeedingCopy} venues`);
  console.log('  Action: Run copy-chain-dishes.cjs --execute');
  console.log();
  console.log('DISCOVERY NEEDED (No source dishes):');
  console.log(`  ${chainsNeedingDiscovery.length} chains, ${totalVenuesNeedingDiscovery} venues`);
  console.log('  Action: Run dish discovery agents on sample venues');
  console.log();

  return {
    summary: {
      totalVenues: allVenues.length,
      totalChains: sortedChains.length,
      chainsComplete: chainsComplete.length,
      chainsNeedingCopy: chainsNeedingCopy.length,
      chainsNeedingDiscovery: chainsNeedingDiscovery.length,
      venuesNeedingCopy: totalVenuesNeedingCopy,
      venuesNeedingDiscovery: totalVenuesNeedingDiscovery,
    },
    chainsNeedingCopy,
    chainsNeedingDiscovery,
    chainsComplete,
  };
}

analyzeChainVenues().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
