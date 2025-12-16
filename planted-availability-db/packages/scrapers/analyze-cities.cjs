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

async function analyzeCities() {
  console.log('Fetching venues and dishes...\n');

  const venuesSnap = await db.collection('venues').get();

  // Fetch dishes by querying the subcollection for each venue
  const dishCountByVenue = {};
  let totalDishes = 0;

  for (const venueDoc of venuesSnap.docs) {
    const dishesSnap = await db.collection('venues').doc(venueDoc.id).collection('dishes').get();
    if (dishesSnap.size > 0) {
      dishCountByVenue[venueDoc.id] = dishesSnap.size;
      totalDishes += dishesSnap.size;
    }
  }

  console.log(`Found ${totalDishes} total dishes across ${Object.keys(dishCountByVenue).length} venues\n`);

  // Group by country and city
  const citiesByCountry = {};

  venuesSnap.forEach(doc => {
    const data = doc.data();
    const venueId = doc.id;
    const dishCount = dishCountByVenue[venueId] || 0;

    // Get country from nested address object
    const country = data.address?.country || 'UNKNOWN';
    const city = data.address?.city || 'Unknown';
    const type = data.type; // Changed from venue_type to type

    if (type !== 'restaurant') return; // Skip retail

    if (!citiesByCountry[country]) {
      citiesByCountry[country] = {};
    }
    if (!citiesByCountry[country][city]) {
      citiesByCountry[country][city] = {
        total: 0,
        withDishes: 0,
        totalDishes: 0
      };
    }

    citiesByCountry[country][city].total++;
    if (dishCount > 0) {
      citiesByCountry[country][city].withDishes++;
      citiesByCountry[country][city].totalDishes += dishCount;
    }
  });

  console.log('MAJOR CITIES ANALYSIS (Restaurants Only)');
  console.log('='.repeat(80));
  console.log(`Total dishes in database: ${totalDishes}\n`);

  // Sort countries and cities by number of restaurants
  Object.keys(citiesByCountry).sort().forEach(country => {
    const cities = citiesByCountry[country];
    const cityList = Object.entries(cities)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15); // Top 15 cities per country

    console.log(`\n${country} - Top Cities:`);
    console.log('-'.repeat(80));

    cityList.forEach(([city, stats]) => {
      const coverage = stats.total > 0 ? ((stats.withDishes / stats.total) * 100).toFixed(1) : '0.0';
      const avgDishes = stats.withDishes > 0 ? (stats.totalDishes / stats.withDishes).toFixed(1) : '0.0';

      const status = stats.withDishes === 0 ? '❌' :
                     coverage >= 80 ? '✅' :
                     coverage >= 50 ? '⚠️' : '🔴';

      console.log(`  ${status} ${city.padEnd(25)} ${stats.withDishes}/${stats.total} venues (${coverage}%) - ${stats.totalDishes} dishes (avg ${avgDishes})`);
    });
  });

  console.log('\n' + '='.repeat(80));
  console.log('Legend: ✅ >= 80% | ⚠️ >= 50% | 🔴 < 50% | ❌ 0%');

  process.exit(0);
}

analyzeCities().catch(console.error);
