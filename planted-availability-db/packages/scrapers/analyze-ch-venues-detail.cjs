#!/usr/bin/env node
/**
 * Analyze CH Venues in Detail
 *
 * Deep dive into CH venues to understand their structure and identify extraction opportunities
 *
 * Usage:
 *   node analyze-ch-venues-detail.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function analyzeChVenues() {
  console.log('Analyzing CH venues in detail...\n');

  const venuesSnap = await db.collection('venues')
    .where('address.country', '==', 'CH')
    .get();

  console.log(`Total CH venues: ${venuesSnap.size}\n`);

  const restaurants = [];
  const retail = [];

  for (const doc of venuesSnap.docs) {
    const data = doc.data();

    // Count dishes
    const dishSnap = await db.collection('dishes')
      .where('venue_id', '==', doc.id)
      .get();

    const venueInfo = {
      id: doc.id,
      name: data.name,
      city: data.address?.city,
      country: data.address?.country,
      type: data.type,
      chain: data.chain,
      status: data.status,
      dishCount: dishSnap.size,
      platforms: data.platform_urls || {},
      hasPlatformUrl: !!(data.platform_urls && Object.keys(data.platform_urls).length > 0)
    };

    if (data.type === 'restaurant') {
      restaurants.push(venueInfo);
    } else {
      retail.push(venueInfo);
    }
  }

  console.log('='.repeat(60));
  console.log('TYPE BREAKDOWN');
  console.log('='.repeat(60));
  console.log(`Restaurants: ${restaurants.length}`);
  console.log(`Retail: ${retail.length}`);

  const restaurantsWithDishes = restaurants.filter(v => v.dishCount > 0);
  const restaurantsWithoutDishes = restaurants.filter(v => v.dishCount === 0);

  console.log('\n' + '='.repeat(60));
  console.log('RESTAURANT DISH STATUS');
  console.log('='.repeat(60));
  console.log(`With dishes: ${restaurantsWithDishes.length}`);
  console.log(`Without dishes: ${restaurantsWithoutDishes.length}`);

  // Sample a few venues to see their structure
  console.log('\n' + '='.repeat(60));
  console.log('SAMPLE VENUES WITH DISHES');
  console.log('='.repeat(60));

  const sampleWithDishes = restaurantsWithDishes.slice(0, 3);
  for (const v of sampleWithDishes) {
    console.log(`\n${v.name} (${v.city}) - ${v.dishCount} dishes`);
    console.log(`  ID: ${v.id}`);
    console.log(`  Chain: ${v.chain || 'None'}`);
    console.log(`  Platform URLs:`, Object.keys(v.platforms).length > 0 ? 'Yes' : 'No');
    if (Object.keys(v.platforms).length > 0) {
      Object.entries(v.platforms).forEach(([platform, url]) => {
        console.log(`    - ${platform}: ${url}`);
      });
    }

    // Get actual dishes
    const dishSnap = await db.collection('dishes')
      .where('venue_id', '==', v.id)
      .get();
    console.log(`  Dishes:`);
    dishSnap.docs.slice(0, 3).forEach(d => {
      const dish = d.data();
      console.log(`    - ${dish.name} (${dish.price?.amount || 0} ${dish.price?.currency || 'CHF'})`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('SAMPLE VENUES WITHOUT DISHES');
  console.log('='.repeat(60));

  const sampleWithoutDishes = restaurantsWithoutDishes.slice(0, 5);
  for (const v of sampleWithoutDishes) {
    console.log(`\n${v.name} (${v.city})`);
    console.log(`  ID: ${v.id}`);
    console.log(`  Chain: ${v.chain || 'None'}`);
    console.log(`  Platform URLs:`, Object.keys(v.platforms).length > 0 ? 'Yes' : 'No');
    if (Object.keys(v.platforms).length > 0) {
      Object.entries(v.platforms).forEach(([platform, url]) => {
        console.log(`    - ${platform}: ${url}`);
      });
    }
  }

  // Check for chain opportunities
  console.log('\n' + '='.repeat(60));
  console.log('CHAIN ANALYSIS (Restaurants without dishes)');
  console.log('='.repeat(60));

  const chainGroups = {};
  restaurantsWithoutDishes.forEach(v => {
    if (!v.chain) return;
    if (!chainGroups[v.chain]) chainGroups[v.chain] = [];
    chainGroups[v.chain].push(v);
  });

  if (Object.keys(chainGroups).length > 0) {
    for (const [chain, venues] of Object.entries(chainGroups).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n${chain}: ${venues.length} CH venues without dishes`);

      // Check if this chain has dishes in other countries
      const chainVenuesSnap = await db.collection('venues')
        .where('chain', '==', chain)
        .get();

      let hasSourceDishes = false;
      for (const doc of chainVenuesSnap.docs) {
        const dishCount = await db.collection('dishes')
          .where('venue_id', '==', doc.id)
          .count()
          .get();

        if (dishCount.data().count > 0) {
          hasSourceDishes = true;
          console.log(`  Can copy dishes from other ${chain} locations`);
          break;
        }
      }

      if (!hasSourceDishes) {
        console.log(`  No source dishes found for ${chain} chain`);
      }
    }
  } else {
    console.log('No chain restaurants without dishes found.');
  }

  console.log('\n');
}

analyzeChVenues()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
