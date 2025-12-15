#!/usr/bin/env node
/**
 * Check Brezelkönig chain for existing dishes
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function checkBrezelkonig() {
  // Find all venues with "brezelkönig" or "brezelkonig" in the name
  const venuesSnap = await db.collection('venues').get();

  const brezelVenues = [];

  for (const doc of venuesSnap.docs) {
    const data = doc.data();
    const name = (data.name || '').toLowerCase();

    if (name.includes('brezelkönig') || name.includes('brezelkonig')) {
      const dishSnap = await db.collection('dishes')
        .where('venue_id', '==', doc.id)
        .get();

      brezelVenues.push({
        id: doc.id,
        name: data.name,
        city: data.address?.city || data.city,
        country: data.address?.country || data.country,
        chain: data.chain,
        dishCount: dishSnap.size,
        dishes: dishSnap.docs.map(d => ({
          name: d.data().name,
          price: d.data().price
        }))
      });
    }
  }

  console.log(`Total Brezelkönig venues: ${brezelVenues.length}\n`);

  const withDishes = brezelVenues.filter(v => v.dishCount > 0);
  const withoutDishes = brezelVenues.filter(v => v.dishCount === 0);

  console.log(`With dishes: ${withDishes.length}`);
  console.log(`Without dishes: ${withoutDishes.length}\n`);

  if (withDishes.length > 0) {
    console.log('Venues with dishes:');
    withDishes.forEach(v => {
      console.log(`\n${v.name} (${v.city}, ${v.country}) - ${v.dishCount} dishes`);
      console.log(`  ID: ${v.id}`);
      console.log(`  Chain field: ${v.chain || 'not set'}`);
      v.dishes.forEach(d => {
        console.log(`  - ${d.name} (${d.price?.amount || 0} ${d.price?.currency || ''})`);
      });
    });
  }

  console.log('\n\nCan copy dishes:', withDishes.length > 0 ? 'YES' : 'NO');

  if (withDishes.length > 0) {
    console.log('\nNext steps:');
    console.log('1. Update chain field for all Brezelkönig venues');
    console.log('2. Run: node copy-chain-dishes.cjs --chain=brezelkönig --execute');
  }
}

checkBrezelkonig()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
