#!/usr/bin/env node
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({ credential: cert(path.resolve(__dirname, '../../service-account.json')) });
const db = getFirestore();

(async () => {
  const venuesSnap = await db.collection('venues').get();
  const neniVenues = [];

  for (const doc of venuesSnap.docs) {
    const data = doc.data();
    const name = (data.name || '').toLowerCase();

    if (name.includes('neni')) {
      const dishSnap = await db.collection('dishes').where('venue_id', '==', doc.id).get();
      neniVenues.push({
        id: doc.id,
        name: data.name,
        city: data.address?.city || data.city,
        country: data.address?.country || data.country,
        chain: data.chain,
        dishCount: dishSnap.size,
        dishes: dishSnap.docs.map(d => ({ name: d.data().name, price: d.data().price }))
      });
    }
  }

  console.log('Total NENI Venues:', neniVenues.length);
  console.log('With dishes:', neniVenues.filter(v => v.dishCount > 0).length);
  console.log('Without dishes:', neniVenues.filter(v => v.dishCount === 0).length);
  console.log('');

  neniVenues.forEach(v => {
    console.log(`${v.name} (${v.city}, ${v.country}) - ${v.dishCount} dishes`);
    console.log('  ID:', v.id);
    console.log('  Chain:', v.chain || 'not set');
    if (v.dishes.length > 0) {
      v.dishes.forEach(d => {
        console.log(`  - ${d.name} (${d.price?.amount || 0} ${d.price?.currency || ''})`);
      });
    }
    console.log('');
  });

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
