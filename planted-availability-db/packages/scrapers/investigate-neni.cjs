#!/usr/bin/env node
/**
 * Investigate NENI Data Discrepancy
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function investigateNENI() {
  console.log('Investigating NENI data discrepancy...\n');

  // Search for NENI venues
  const venuesSnap = await db.collection('venues').get();
  const neniVenues = venuesSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(v => (v.name || '').toLowerCase().includes('neni'));

  console.log(`NENI Venues Found: ${neniVenues.length}`);
  console.log('-'.repeat(60));

  // Check dishes for each NENI venue
  for (const venue of neniVenues) {
    const dishSnap = await db.collection('dishes')
      .where('venue_id', '==', venue.id)
      .get();

    console.log(`\nVenue: ${venue.name}`);
    console.log(`  ID: ${venue.id}`);
    console.log(`  City: ${venue.address?.city || venue.city}`);
    console.log(`  Chain ID: ${venue.chain_id || 'null'}`);
    console.log(`  Chain Name: ${venue.chain_name || 'null'}`);
    console.log(`  Dishes: ${dishSnap.size}`);

    if (dishSnap.size > 0) {
      dishSnap.docs.forEach(doc => {
        const dish = doc.data();
        console.log(`    - ${dish.name}`);
      });
    }
  }

  // Also check for 'Jerusalem Plate' dishes
  console.log('\n' + '='.repeat(60));
  console.log('Searching for Jerusalem Plate dishes...\n');

  const dishSnap = await db.collection('dishes').get();
  const jerusalemDishes = dishSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(d => (d.name || '').toLowerCase().includes('jerusalem'));

  console.log(`Jerusalem dishes found: ${jerusalemDishes.length}`);
  jerusalemDishes.forEach(dish => {
    console.log(`\n  Dish: ${dish.name}`);
    console.log(`  Venue ID: ${dish.venue_id}`);
    console.log(`  Price: ${dish.price?.amount || 0} ${dish.price?.currency || ''}`);
  });
}

investigateNENI().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
