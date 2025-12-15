#!/usr/bin/env node
/**
 * Analyze Chain Discovery Needs
 *
 * Detailed breakdown of which chains need discovery vs which are retail (no dishes expected).
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

// Retail chains that don't serve dishes (grocery stores)
const RETAIL_CHAINS = [
  'BILLA',
  'Coop',
  'INTERSPAR',
  'REWE',
  'Cadoro',
];

async function analyzeChainDiscoveryNeeds() {
  console.log('Fetching venues and dishes...\n');

  const venuesSnap = await db.collection('venues').get();
  const allVenues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const dishesSnap = await db.collection('dishes').get();
  const dishesByVenue = {};
  dishesSnap.docs.forEach(doc => {
    const dish = doc.data();
    if (!dishesByVenue[dish.venue_id]) {
      dishesByVenue[dish.venue_id] = [];
    }
    dishesByVenue[dish.venue_id].push({ id: doc.id, ...dish });
  });

  // Group by chain
  const chainGroups = {};

  allVenues.forEach(venue => {
    const chainId = venue.chain_id;
    if (!chainId) return;

    const dishCount = dishesByVenue[venue.id]?.length || 0;

    if (!chainGroups[chainId]) {
      chainGroups[chainId] = {
        chainId,
        chainName: venue.chain_name || venue.name,
        venues: [],
        withDishes: 0,
        withoutDishes: 0,
      };
    }

    chainGroups[chainId].venues.push({
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
    });

    if (dishCount > 0) {
      chainGroups[chainId].withDishes++;
    } else {
      chainGroups[chainId].withoutDishes++;
    }
  });

  const chainsNeedingDiscovery = Object.values(chainGroups)
    .filter(c => c.withDishes === 0)
    .sort((a, b) => b.venues.length - a.venues.length);

  // Separate retail from restaurants
  const retailChains = [];
  const restaurantChains = [];

  chainsNeedingDiscovery.forEach(chain => {
    const isRetail = RETAIL_CHAINS.some(r => chain.chainName.toLowerCase().includes(r.toLowerCase()));
    if (isRetail) {
      retailChains.push(chain);
    } else {
      restaurantChains.push(chain);
    }
  });

  console.log('='.repeat(80));
  console.log('CHAIN DISCOVERY NEEDS ANALYSIS');
  console.log('='.repeat(80));
  console.log();

  console.log('RETAIL CHAINS (No dishes expected):');
  console.log('-'.repeat(80));
  retailChains.forEach(chain => {
    console.log(`  ${chain.chainName}: ${chain.venues.length} venues`);
  });
  console.log(`\nTotal retail venues: ${retailChains.reduce((sum, c) => sum + c.venues.length, 0)}`);
  console.log();

  console.log('RESTAURANT CHAINS NEEDING DISCOVERY:');
  console.log('-'.repeat(80));
  restaurantChains.forEach(chain => {
    console.log(`\n  ${chain.chainName}: ${chain.venues.length} venues`);

    // Find venues with platform URLs
    const withPlatforms = chain.venues.filter(v =>
      v.platforms.uber_eats || v.platforms.wolt || v.platforms.lieferando || v.platforms.just_eat
    );

    console.log(`    Venues with platform URLs: ${withPlatforms.length}/${chain.venues.length}`);

    if (withPlatforms.length > 0) {
      const sample = withPlatforms[0];
      console.log(`    Sample venue: ${sample.name} (${sample.city})`);
      if (sample.platforms.uber_eats) console.log(`      Uber Eats: ${sample.platforms.uber_eats}`);
      if (sample.platforms.wolt) console.log(`      Wolt: ${sample.platforms.wolt}`);
      if (sample.platforms.lieferando) console.log(`      Lieferando: ${sample.platforms.lieferando}`);
      if (sample.platforms.just_eat) console.log(`      Just Eat: ${sample.platforms.just_eat}`);
    } else {
      console.log(`    WARNING: No platform URLs found!`);
    }
  });
  console.log();

  const totalRestaurantVenues = restaurantChains.reduce((sum, c) => sum + c.venues.length, 0);

  console.log('='.repeat(80));
  console.log('SUMMARY:');
  console.log('='.repeat(80));
  console.log(`Retail chains: ${retailChains.length} chains, ${retailChains.reduce((sum, c) => sum + c.venues.length, 0)} venues (SKIP)`);
  console.log(`Restaurant chains needing discovery: ${restaurantChains.length} chains, ${totalRestaurantVenues} venues`);
  console.log();

  console.log('PRIORITY ORDER FOR DISCOVERY:');
  console.log('-'.repeat(80));
  restaurantChains.forEach((chain, i) => {
    const withPlatforms = chain.venues.filter(v =>
      v.platforms.uber_eats || v.platforms.wolt || v.platforms.lieferando || v.platforms.just_eat
    ).length;
    console.log(`${i + 1}. ${chain.chainName}: ${chain.venues.length} venues (${withPlatforms} with URLs)`);
  });
  console.log();
}

analyzeChainDiscoveryNeeds().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
