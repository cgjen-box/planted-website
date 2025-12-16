#!/usr/bin/env node
/**
 * Query T024 Venues - Find 4 CH chains without platform URLs
 *
 * Usage:
 *   node query-t024-venues.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function queryT024Venues() {
  console.log('Finding T024 target venues...\n');

  const targetNames = [
    'Chupenga',
    'Mit&Ohne',
    'Tibits',
    'Max & Benito'
  ];

  // Get all CH venues
  const chVenuesSnap = await db.collection('venues')
    .where('address.country', '==', 'CH')
    .get();

  console.log(`Total CH venues: ${chVenuesSnap.size}\n`);

  const targetVenues = [];

  for (const doc of chVenuesSnap.docs) {
    const data = doc.data();
    const name = data.name || '';

    // Check if name matches any target
    const matchesTarget = targetNames.some(target =>
      name.toLowerCase().includes(target.toLowerCase())
    );

    if (matchesTarget) {
      // Get dish count
      const dishCount = await db.collection('dishes')
        .where('venue_id', '==', doc.id)
        .count()
        .get();

      // Get platform URLs
      const platforms = data.delivery_platforms || [];
      const platformUrls = platforms.map(p => p.url || p.platform).filter(Boolean);

      targetVenues.push({
        id: doc.id,
        name: data.name,
        city: data.address?.city,
        type: data.type,
        chain: data.chain || 'no chain',
        dishCount: dishCount.data().count,
        platformCount: platformUrls.length,
        platforms: platformUrls,
        allPlatforms: platforms
      });
    }
  }

  console.log('='.repeat(80));
  console.log('T024 TARGET VENUES');
  console.log('='.repeat(80));

  targetVenues.sort((a, b) => a.name.localeCompare(b.name));

  for (const venue of targetVenues) {
    console.log(`\n${venue.name} (${venue.city})`);
    console.log(`  ID: ${venue.id}`);
    console.log(`  Type: ${venue.type}`);
    console.log(`  Chain: ${venue.chain}`);
    console.log(`  Dishes: ${venue.dishCount}`);
    console.log(`  Platform URLs: ${venue.platformCount}`);
    if (venue.platformCount > 0) {
      venue.platforms.forEach(p => console.log(`    - ${p}`));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total venues found: ${targetVenues.length}`);
  console.log(`Venues with 0 platform URLs: ${targetVenues.filter(v => v.platformCount === 0).length}`);
  console.log(`Venues with 0 dishes: ${targetVenues.filter(v => v.dishCount === 0).length}`);
  console.log('\n');
}

queryT024Venues()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
