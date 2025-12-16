#!/usr/bin/env node
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function getT024Details() {
  const ids = [
    '3thdrRxKneliOrAK23Bm', // Chupenga
    'xUPYEVNG5gmeSBNX5U9B', // Max & Benito
    'Bd7JDajYNhnStKetUtnX', // Mit&Ohne - HB Zürich
    'LxMPQ1oyp0dcQX0MzRBh'  // Tibits Zürich
  ];

  for (const id of ids) {
    const doc = await db.collection('venues').doc(id).get();
    const data = doc.data();

    const dishCount = await db.collection('dishes')
      .where('venue_id', '==', id)
      .count()
      .get();

    const platforms = data.delivery_platforms || [];

    console.log('\n' + '='.repeat(80));
    console.log('Name:', data.name);
    console.log('ID:', id);
    console.log('Country:', data.address?.country || data.country);
    console.log('City:', data.address?.city);
    console.log('Type:', data.type);
    console.log('Chain:', data.chain || 'no chain');
    console.log('Dishes:', dishCount.data().count);
    console.log('\nDelivery Platforms:');
    if (platforms.length > 0) {
      platforms.forEach(p => {
        console.log('  Platform:', p.platform || 'unknown');
        console.log('  URL:', p.url || 'no URL');
        console.log('  Active:', p.active !== false);
        console.log('  ---');
      });
    } else {
      console.log('  (none)');
    }
  }
}

getT024Details()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
