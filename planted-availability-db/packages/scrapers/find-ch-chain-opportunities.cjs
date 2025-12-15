#!/usr/bin/env node
/**
 * Find CH Chain Opportunities
 *
 * Check if CH venues without dishes have matching chains in other countries
 *
 * Usage:
 *   node find-ch-chain-opportunities.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

function normalizeChainName(name) {
  if (!name) return null;
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s&-]/g, '')
    .trim();
}

async function findChainOpportunities() {
  console.log('Finding CH chain opportunities...\n');

  // Get all CH restaurants without dishes
  const chVenuesSnap = await db.collection('venues')
    .where('address.country', '==', 'CH')
    .get();

  const chRestaurantsWithoutDishes = [];

  for (const doc of chVenuesSnap.docs) {
    const data = doc.data();
    if (data.type !== 'restaurant') continue;

    const dishCount = await db.collection('dishes')
      .where('venue_id', '==', doc.id)
      .count()
      .get();

    if (dishCount.data().count === 0) {
      chRestaurantsWithoutDishes.push({
        id: doc.id,
        name: data.name,
        normalizedName: normalizeChainName(data.name),
        city: data.address?.city,
        chain: data.chain
      });
    }
  }

  console.log(`CH restaurants without dishes: ${chRestaurantsWithoutDishes.length}\n`);

  // Get all venues with dishes from other countries
  const allVenuesSnap = await db.collection('venues').get();

  const venuesWithDishes = [];

  for (const doc of allVenuesSnap.docs) {
    const data = doc.data();

    const dishCount = await db.collection('dishes')
      .where('venue_id', '==', doc.id)
      .count()
      .get();

    if (dishCount.data().count > 0) {
      venuesWithDishes.push({
        id: doc.id,
        name: data.name,
        normalizedName: normalizeChainName(data.name),
        city: data.address?.city || data.city,
        country: data.address?.country || data.country,
        chain: data.chain,
        dishCount: dishCount.data().count
      });
    }
  }

  console.log(`Venues with dishes (all countries): ${venuesWithDishes.length}\n`);

  console.log('='.repeat(60));
  console.log('POTENTIAL CHAIN MATCHES');
  console.log('='.repeat(60));

  let matchesFound = 0;

  for (const chVenue of chRestaurantsWithoutDishes) {
    // Try to find matches by name similarity
    const matches = venuesWithDishes.filter(v => {
      // Exact match on normalized name
      if (v.normalizedName === chVenue.normalizedName && chVenue.normalizedName) {
        return true;
      }

      // Check if one name contains the other (for chains like "NENI Restaurants" vs "NENI")
      if (chVenue.normalizedName && v.normalizedName) {
        const chName = chVenue.normalizedName;
        const vName = v.normalizedName;

        if (chName.includes(vName) || vName.includes(chName)) {
          // At least 4 characters to avoid false matches
          return Math.min(chName.length, vName.length) >= 4;
        }
      }

      return false;
    });

    if (matches.length > 0) {
      matchesFound++;
      console.log(`\nCH: ${chVenue.name} (${chVenue.city})`);
      console.log(`    ID: ${chVenue.id}`);
      console.log(`    Matches found in other countries:`);

      matches.slice(0, 3).forEach(m => {
        console.log(`    - ${m.name} (${m.city}, ${m.country}) - ${m.dishCount} dishes [${m.id}]`);
      });

      if (matches.length > 3) {
        console.log(`    ... and ${matches.length - 3} more matches`);
      }
    }
  }

  if (matchesFound === 0) {
    console.log('\nNo chain matches found.');
    console.log('CH venues without dishes appear to be independent restaurants.');
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`CH restaurants without dishes: ${chRestaurantsWithoutDishes.length}`);
  console.log(`Potential chain matches found: ${matchesFound}`);

  if (matchesFound > 0) {
    console.log('\nNext steps:');
    console.log('1. Review the matches above');
    console.log('2. If they are the same chain, update chain field in venues');
    console.log('3. Run copy-chain-dishes.cjs to copy dishes');
  } else {
    console.log('\nNext steps:');
    console.log('1. These venues need manual dish extraction');
    console.log('2. Check if they have delivery platform pages');
    console.log('3. Use SmartDishFinderAgent or manual research');
  }

  console.log('\n');
}

findChainOpportunities()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
