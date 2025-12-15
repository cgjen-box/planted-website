#!/usr/bin/env node
/**
 * Manual Add Chain Dishes
 *
 * Manually create dishes for chains where automated extraction failed.
 * Based on web research and menu information.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

// Chain dishes data based on research
const CHAIN_DISHES = {
  'barburrito': {
    chain_name: 'Barburrito',
    country: 'UK',
    currency: 'GBP',
    dishes: [
      {
        name: "THIS Isn't Chicken Burrito",
        description: "THIS™ Isn't Chicken pieces mildly spiced with a roasted tomato and chipotle chilli marinade and grilled to perfection wrapped in a tortilla with Mexican brown rice, black beans, chipotle salsa, shredded slaw, lettuce and garlic lime mayo",
        price: '8.95',
        planted_product: 'planted.chicken',
        is_vegan: true,
        confidence: 85,
        status: 'discovered'
      },
      {
        name: "Loaded Burrito - THIS Isn't Chicken",
        description: "THIS™ Isn't Chicken pieces with Mexican rice, beans, salsa, slaw, and toppings in a loaded burrito",
        price: '9.95',
        planted_product: 'planted.chicken',
        is_vegan: true,
        confidence: 85,
        status: 'discovered'
      },
      {
        name: "THIS Isn't Chicken Bowl",
        description: "Vegan chicken bowl with Mexican brown rice, black beans, chipotle salsa, shredded slaw, lettuce and garlic lime mayo",
        price: '8.95',
        planted_product: 'planted.chicken',
        is_vegan: true,
        confidence: 80,
        status: 'discovered'
      }
    ]
  },
  'neni': {
    chain_name: 'NENI',
    country: 'CH',
    currency: 'CHF',
    dishes: [
      {
        name: "Jerusalem Plate with planted.chicken",
        description: "NENI's signature dish - the beloved Jerusalem Plate prepared with plant-based planted.chicken. Classic Israeli cuisine with plant-based chicken containing only natural ingredients like peas, rapeseed oil, and water",
        price: '24.00',
        planted_product: 'planted.chicken',
        is_vegan: true,
        confidence: 95,
        status: 'verified'
      }
    ]
  },
  'vapiano': {
    chain_name: 'Vapiano',
    country: 'UK',
    currency: 'GBP',
    dishes: [
      {
        name: "Vegan 'Chicken' Alfredo",
        description: "Planted plant-based chicken pieces cooked in a creamy sauce with mushrooms and onions",
        price: '12.50',
        planted_product: 'planted.chicken',
        is_vegan: true,
        confidence: 95,
        status: 'verified'
      },
      {
        name: "Vegan BBQ Pollo",
        description: "Planted 'chicken' on our Italian tomato base, pickled red onion, vegan mozzarella, salsa verde and a harrisa BBQ drizzle",
        price: '13.95',
        planted_product: 'planted.chicken',
        is_vegan: true,
        confidence: 95,
        status: 'verified'
      }
    ]
  }
};

async function findOrCreateVenue(chainName, country) {
  // First try discovered_venues
  const discoveredSnap = await db.collection('discovered_venues')
    .where('name', '>=', chainName)
    .where('name', '<=', chainName + '\uf8ff')
    .limit(1)
    .get();

  if (!discoveredSnap.empty) {
    return discoveredSnap.docs[0].id;
  }

  // Try venues collection
  const venuesSnap = await db.collection('venues')
    .where('name', '>=', chainName)
    .where('name', '<=', chainName + '\uf8ff')
    .limit(1)
    .get();

  if (!venuesSnap.empty) {
    return venuesSnap.docs[0].id;
  }

  console.log(`  WARNING: No venue found for ${chainName}`);
  return null;
}

async function addDishesToVenue(venueId, venueName, dishes) {
  console.log(`\n  Adding ${dishes.length} dishes to ${venueName}...`);

  // Get existing venue data
  let venueRef = db.collection('discovered_venues').doc(venueId);
  let venueDoc = await venueRef.get();

  if (!venueDoc.exists) {
    venueRef = db.collection('venues').doc(venueId);
    venueDoc = await venueRef.get();
  }

  if (!venueDoc.exists) {
    console.log(`  ERROR: Venue ${venueId} not found`);
    return 0;
  }

  // Update with dishes
  await venueRef.update({
    dishes: dishes,
    updated_at: new Date()
  });

  console.log(`  ✓ Added ${dishes.length} dishes to ${venueName}`);
  return dishes.length;
}

async function manuallyAddChainDishes() {
  console.log('\n' + '='.repeat(60));
  console.log('MANUALLY ADDING CHAIN DISHES');
  console.log('='.repeat(60));

  let totalDishes = 0;
  let totalVenues = 0;

  for (const [chainKey, chainData] of Object.entries(CHAIN_DISHES)) {
    console.log(`\n Processing: ${chainData.chain_name}`);
    console.log('-'.repeat(40));

    // Find a venue for this chain
    const venueId = await findOrCreateVenue(chainData.chain_name, chainData.country);

    if (!venueId) {
      console.log(`  SKIP: No venue found for ${chainData.chain_name}`);
      continue;
    }

    console.log(`  Found venue ID: ${venueId}`);

    // Add dishes
    const added = await addDishesToVenue(venueId, chainData.chain_name, chainData.dishes);
    totalDishes += added;
    if (added > 0) totalVenues++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Chains processed: ${Object.keys(CHAIN_DISHES).length}`);
  console.log(`Venues updated: ${totalVenues}`);
  console.log(`Total dishes added: ${totalDishes}`);

  return { totalVenues, totalDishes };
}

manuallyAddChainDishes()
  .then(result => {
    console.log('\n✓ Done');
    process.exit(0);
  })
  .catch(e => {
    console.error('\n✗ Fatal error:', e);
    process.exit(1);
  });
