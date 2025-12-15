#!/usr/bin/env node
/**
 * Add CH Chain Dishes
 *
 * Manually create dishes for Brezelkönig and NENI chains based on web research
 *
 * Usage:
 *   node add-ch-chain-dishes.cjs                # Dry run
 *   node add-ch-chain-dishes.cjs --execute      # Actually create dishes
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

// Dishes to add based on web research
const CHAIN_DISHES = {
  'brezelkönig': {
    chain_name: 'Brezelkönig',
    normalizedName: 'brezelk',  // Search for 'brezelk' to catch both ö and o variants
    dishes: [
      {
        name: 'Baguette Planted Chicken',
        description: 'Laugenbaguette mit Planted.Chicken, Lollo Verde und Curry-Sauce (100% pflanzlich)',
        price: { amount: 8.20, currency: 'CHF' },
        planted_products: ['planted.chicken'],
        dietary_tags: ['vegan', 'vegetarian'],
        status: 'active',
        availability: 'permanent',
        confidence_score: 90,
        source: 'manual_research'
      }
    ]
  },
  'neni': {
    chain_name: 'NENI',
    normalizedName: 'neni',
    dishes: [
      {
        name: 'Jerusalem Plate with planted.chicken',
        description: 'NENI Hummus Klassik, Planted Chicken with Jerusalem spices, Amba, Tahina powder, roasted vegetables, and pita bread',
        price: { amount: 24.00, currency: 'CHF' },
        planted_products: ['planted.chicken'],
        dietary_tags: ['vegan', 'vegetarian'],
        status: 'active',
        availability: 'permanent',
        confidence_score: 95,
        source: 'manual_research'
      }
    ]
  },
  'yardbird': {
    chain_name: 'Yardbird',
    normalizedName: 'yardbird',
    dishes: [
      {
        name: 'Fried Planted Chicken',
        description: 'Southern fried Planted™ chicken - gluten-free and 100% plant-based',
        price: { amount: 27.00, currency: 'CHF' },
        planted_products: ['planted.chicken'],
        dietary_tags: ['vegan', 'vegetarian', 'gluten-free'],
        status: 'active',
        availability: 'permanent',
        confidence_score: 85,
        source: 'manual_research'
      },
      {
        name: 'Planted™ Wings (9 pieces)',
        description: 'Vegan wings made with Planted™ chicken, available in multiple flavors',
        price: { amount: 18.00, currency: 'CHF' },
        planted_products: ['planted.chicken'],
        dietary_tags: ['vegan', 'vegetarian', 'gluten-free'],
        status: 'active',
        availability: 'permanent',
        confidence_score: 85,
        source: 'manual_research'
      }
    ]
  }
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    execute: args.includes('--execute')
  };
}

async function findVenuesByName(namePattern) {
  const venuesSnap = await db.collection('venues').get();
  const matches = [];

  for (const doc of venuesSnap.docs) {
    const data = doc.data();
    const name = (data.name || '').toLowerCase();

    if (name.includes(namePattern.toLowerCase())) {
      const dishCount = await db.collection('dishes')
        .where('venue_id', '==', doc.id)
        .count()
        .get();

      matches.push({
        id: doc.id,
        name: data.name,
        city: data.address?.city,
        country: data.address?.country,
        dishCount: dishCount.data().count
      });
    }
  }

  return matches;
}

async function addDishToVenue(dish, venueId, execute) {
  const dishData = {
    ...dish,
    venue_id: venueId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (execute) {
    const docRef = await db.collection('dishes').add(dishData);
    return docRef.id;
  } else {
    return '(would create)';
  }
}

async function addChainDishes() {
  const { execute } = parseArgs();

  console.log('\n' + '='.repeat(60));
  console.log(execute ? 'EXECUTING: Add CH Chain Dishes' : 'DRY RUN: Add CH Chain Dishes');
  console.log('='.repeat(60));

  let totalVenuesUpdated = 0;
  let totalDishesAdded = 0;

  for (const [chainKey, chainData] of Object.entries(CHAIN_DISHES)) {
    console.log(`\n Processing: ${chainData.chain_name}`);
    console.log('-'.repeat(40));

    // Find all venues for this chain
    const venues = await findVenuesByName(chainData.normalizedName);

    if (venues.length === 0) {
      console.log(`   No venues found for ${chainData.chain_name}`);
      continue;
    }

    console.log(`   Found ${venues.length} venues`);

    // Filter to venues without dishes
    const venuesWithoutDishes = venues.filter(v => v.dishCount === 0);
    const venuesWithDishes = venues.filter(v => v.dishCount > 0);

    console.log(`   - ${venuesWithDishes.length} already have dishes`);
    console.log(`   - ${venuesWithoutDishes.length} need dishes\n`);

    if (venuesWithoutDishes.length === 0) {
      console.log(`   All ${chainData.chain_name} venues already have dishes`);
      continue;
    }

    // Add dishes to each venue without dishes
    for (const venue of venuesWithoutDishes) {
      console.log(`   ${execute ? 'Adding' : 'Would add'} ${chainData.dishes.length} dish(es) to:`);
      console.log(`   - ${venue.name} (${venue.city}, ${venue.country}) [${venue.id}]`);

      for (const dish of chainData.dishes) {
        const dishId = await addDishToVenue(dish, venue.id, execute);
        console.log(`     ${execute ? 'Created' : 'Would create'} dish: ${dish.name} [${dishId}]`);
        totalDishesAdded++;
      }

      totalVenuesUpdated++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Chains processed: ${Object.keys(CHAIN_DISHES).length}`);
  console.log(`Venues updated: ${totalVenuesUpdated}`);
  console.log(`Dishes ${execute ? 'created' : 'would create'}: ${totalDishesAdded}`);

  if (!execute && totalDishesAdded > 0) {
    console.log('\n To actually create dishes, run:');
    console.log('   node add-ch-chain-dishes.cjs --execute');
  }

  console.log('\n');

  return { totalVenuesUpdated, totalDishesAdded };
}

addChainDishes()
  .then(result => {
    console.log('Done\n');
    process.exit(0);
  })
  .catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
