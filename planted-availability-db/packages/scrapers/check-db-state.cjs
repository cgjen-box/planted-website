#!/usr/bin/env node
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

(async () => {
  // Get all venues
  const venuesSnap = await db.collection('venues').get();
  const venues = [];

  for (const doc of venuesSnap.docs) {
    const v = doc.data();
    const dishSnap = await db.collection('dishes')
      .where('venue_id', '==', doc.id)
      .count()
      .get();

    venues.push({
      id: doc.id,
      name: v.name,
      country: v.address?.country || v.country,
      city: v.address?.city || v.city,
      dishCount: dishSnap.data().count,
      status: v.status
    });
  }

  const total = venues.length;
  const active = venues.filter(v => v.status === 'active');
  const withDishes = venues.filter(v => v.dishCount > 0);
  const activeWithDishes = active.filter(v => v.dishCount > 0);

  console.log('=== DATABASE STATE ===');
  console.log('Total venues:', total);
  console.log('Active venues:', active.length);
  console.log('Venues with dishes:', withDishes.length);
  console.log('Active venues with dishes:', activeWithDishes.length);
  console.log('Coverage:', (activeWithDishes.length / active.length * 100).toFixed(1) + '%');

  // By country
  console.log('\n=== BY COUNTRY ===');
  const byCountry = {};
  for (const v of active) {
    const c = v.country || 'UNKNOWN';
    if (!byCountry[c]) byCountry[c] = { total: 0, withDishes: 0 };
    byCountry[c].total++;
    if (v.dishCount > 0) byCountry[c].withDishes++;
  }
  Object.entries(byCountry).sort((a,b) => b[1].total - a[1].total).forEach(([c, d]) => {
    console.log(c + ': ' + d.withDishes + '/' + d.total + ' (' + (d.withDishes/d.total*100).toFixed(0) + '%)');
  });

  // Zero dish venues
  const zeroDish = active.filter(v => v.dishCount === 0);
  console.log('\n=== ZERO DISH ACTIVE VENUES (' + zeroDish.length + ') ===');
  zeroDish.slice(0, 30).forEach(v => {
    console.log('- ' + v.name + ' (' + v.city + ', ' + v.country + ')');
  });
  if (zeroDish.length > 30) console.log('... and ' + (zeroDish.length - 30) + ' more');

  process.exit(0);
})();
