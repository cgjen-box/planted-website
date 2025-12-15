#!/usr/bin/env node
/**
 * Simple list of CH venues without dishes
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function listChVenues() {
  const venuesSnap = await db.collection('venues')
    .where('address.country', '==', 'CH')
    .where('type', '==', 'restaurant')
    .get();

  const results = [];

  for (const doc of venuesSnap.docs) {
    const data = doc.data();

    const dishSnap = await db.collection('dishes')
      .where('venue_id', '==', doc.id)
      .count()
      .get();

    if (dishSnap.data().count === 0) {
      results.push({
        id: doc.id,
        name: data.name,
        city: data.address?.city,
        chain: data.chain || 'no chain'
      });
    }
  }

  console.log('CH Restaurants without dishes:\n');
  results.forEach(v => {
    console.log(`${v.name} (${v.city}) [Chain: ${v.chain}]`);
    console.log(`  ID: ${v.id}\n`);
  });

  console.log(`\nTotal: ${results.length} venues`);
}

listChVenues()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
