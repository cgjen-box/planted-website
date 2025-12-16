const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', '..', 'service-account.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function findUberEatsVenues() {
  console.log('Fetching venues and dishes...\n');

  const venuesSnap = await db.collection('production_venues').get();
  const dishesSnap = await db.collection('production_dishes').get();

  const dishCountByVenue = {};
  dishesSnap.forEach(doc => {
    const venueId = doc.data().venue_id;
    dishCountByVenue[venueId] = (dishCountByVenue[venueId] || 0) + 1;
  });

  const uberEatsNoDishesByCountry = {};
  let totalCount = 0;

  venuesSnap.forEach(doc => {
    const data = doc.data();
    const venueId = doc.id;
    const dishCount = dishCountByVenue[venueId] || 0;
    const country = data.country || 'UNKNOWN';
    const type = data.venue_type;

    // Only restaurants with 0 dishes and Uber Eats URLs
    if (type === 'restaurant' && dishCount === 0) {
      const platforms = data.delivery_platforms || [];
      const hasUberEats = platforms.some(p => p.platform === 'uber_eats' && p.url);

      if (hasUberEats) {
        if (!uberEatsNoDishesByCountry[country]) {
          uberEatsNoDishesByCountry[country] = [];
        }
        uberEatsNoDishesByCountry[country].push({
          name: data.name,
          city: data.city,
          id: venueId,
          url: platforms.find(p => p.platform === 'uber_eats').url
        });
        totalCount++;
      }
    }
  });

  console.log('RESTAURANTS WITH UBER EATS URLs BUT 0 DISHES:');
  console.log('='.repeat(80));
  console.log(`Total: ${totalCount} venues\n`);

  Object.keys(uberEatsNoDishesByCountry).sort().forEach(country => {
    const venues = uberEatsNoDishesByCountry[country];
    console.log(`${country}: ${venues.length} venues`);
    venues.slice(0, 10).forEach(v => {
      console.log(`  - ${v.name} (${v.city})`);
      console.log(`    ID: ${v.id}`);
      console.log(`    URL: ${v.url}`);
    });
    if (venues.length > 10) {
      console.log(`  ... and ${venues.length - 10} more`);
    }
    console.log();
  });

  process.exit(0);
}

findUberEatsVenues().catch(console.error);
