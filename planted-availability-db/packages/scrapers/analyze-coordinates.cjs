#!/usr/bin/env node
/**
 * Analyze Venue Coordinates
 *
 * Check which venues with dishes have invalid coordinates,
 * and whether they have delivery platform URLs we can scrape for coordinates.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

function hasValidLocation(venue) {
  const loc = venue.location;
  return loc && loc.latitude && loc.longitude &&
    (Math.abs(loc.latitude) > 1 || Math.abs(loc.longitude) > 1);
}

function detectPlatformFromUrl(url) {
  if (!url) return null;
  if (url.includes('ubereats.com')) return 'uber-eats';
  if (url.includes('just-eat') || url.includes('eat.ch')) return 'just-eat';
  if (url.includes('lieferando')) return 'lieferando';
  if (url.includes('wolt.com')) return 'wolt';
  if (url.includes('smood.ch')) return 'smood';
  if (url.includes('deliveroo.')) return 'deliveroo';
  if (url.includes('glovoapp.') || url.includes('glovo.')) return 'glovo';
  return null;
}

async function analyzeCoordinates() {
  console.log('\n' + '='.repeat(70));
  console.log('COORDINATE ANALYSIS');
  console.log('='.repeat(70) + '\n');

  // Load all venues
  const venuesSnap = await db.collection('venues').get();
  console.log(`Total venues: ${venuesSnap.size}\n`);

  const stats = {
    total: venuesSnap.size,
    withDishes: 0,
    withValidCoords: 0,
    withInvalidCoords: 0,
    invalidWithPlatformUrls: 0,
    invalidWithoutPlatformUrls: 0,
    byPlatform: {}
  };

  const invalidVenuesWithUrls = [];
  const invalidVenuesWithoutUrls = [];

  for (const doc of venuesSnap.docs) {
    const v = doc.data();
    v.id = doc.id;

    // Check if has dishes
    const dishSnap = await db.collection('dishes')
      .where('venue_id', '==', v.id)
      .count()
      .get();

    const dishCount = dishSnap.data().count;
    if (dishCount === 0) continue;

    stats.withDishes++;

    if (hasValidLocation(v)) {
      stats.withValidCoords++;
    } else {
      stats.withInvalidCoords++;

      // Check for platform URLs
      const deliveryPlatforms = v.delivery_platforms || [];
      const firstPlatform = deliveryPlatforms[0];

      if (firstPlatform?.url) {
        const platform = detectPlatformFromUrl(firstPlatform.url);
        stats.invalidWithPlatformUrls++;

        if (platform) {
          stats.byPlatform[platform] = (stats.byPlatform[platform] || 0) + 1;
        }

        invalidVenuesWithUrls.push({
          id: v.id,
          name: v.name,
          city: v.address?.city || v.city || 'Unknown',
          country: v.address?.country || v.country || 'Unknown',
          platform: platform || 'unknown',
          url: firstPlatform.url,
          dishes: dishCount
        });
      } else {
        stats.invalidWithoutPlatformUrls++;
        invalidVenuesWithoutUrls.push({
          id: v.id,
          name: v.name,
          city: v.address?.city || v.city || 'Unknown',
          country: v.address?.country || v.country || 'Unknown',
          dishes: dishCount
        });
      }
    }
  }

  // Print results
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total venues: ${stats.total}`);
  console.log(`Venues with dishes: ${stats.withDishes}`);
  console.log(`  ✓ Valid coordinates (lat/lng): ${stats.withValidCoords}`);
  console.log(`  ✗ Invalid coordinates (0,0): ${stats.withInvalidCoords}`);
  console.log(`\n  Invalid venues WITH platform URLs (can geocode): ${stats.invalidWithPlatformUrls}`);
  console.log(`  Invalid venues WITHOUT platform URLs (need manual fix): ${stats.invalidWithoutPlatformUrls}`);

  console.log('\nPLATFORM BREAKDOWN (venues we can geocode)');
  console.log('='.repeat(70));
  for (const [platform, count] of Object.entries(stats.byPlatform).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${platform.padEnd(20)} ${count}`);
  }

  console.log('\nVENUES WITH PLATFORM URLS (can geocode)');
  console.log('='.repeat(70));
  console.log(`Found ${invalidVenuesWithUrls.length} venues\n`);

  for (const v of invalidVenuesWithUrls.slice(0, 20)) {
    console.log(`${v.name}`);
    console.log(`  City: ${v.city}, ${v.country}`);
    console.log(`  Platform: ${v.platform}`);
    console.log(`  Dishes: ${v.dishes}`);
    console.log(`  URL: ${v.url}`);
    console.log('');
  }

  if (invalidVenuesWithUrls.length > 20) {
    console.log(`... and ${invalidVenuesWithUrls.length - 20} more\n`);
  }

  console.log('\nVENUES WITHOUT PLATFORM URLS (need manual geocoding)');
  console.log('='.repeat(70));
  console.log(`Found ${invalidVenuesWithoutUrls.length} venues\n`);

  for (const v of invalidVenuesWithoutUrls.slice(0, 20)) {
    console.log(`${v.name} (${v.city}, ${v.country}) - ${v.dishes} dishes`);
  }

  if (invalidVenuesWithoutUrls.length > 20) {
    console.log(`... and ${invalidVenuesWithoutUrls.length - 20} more\n`);
  }

  // Export to CSV for manual geocoding
  if (invalidVenuesWithoutUrls.length > 0) {
    const fs = require('fs');
    const csv = [
      'ID,Name,Street,City,Country,Dishes,Latitude,Longitude',
      ...invalidVenuesWithoutUrls.map(v =>
        `${v.id},"${v.name}","","${v.city}","${v.country}",${v.dishes},0,0`
      )
    ].join('\n');

    const csvPath = path.join(__dirname, 'venues-need-manual-geocoding.csv');
    fs.writeFileSync(csvPath, csv);
    console.log(`\nExported to: ${csvPath}`);
    console.log('You can use Google Sheets or a geocoding service to fill in coordinates.\n');
  }

  return {
    canGeocode: stats.invalidWithPlatformUrls,
    needManual: stats.invalidWithoutPlatformUrls
  };
}

analyzeCoordinates()
  .then(result => {
    console.log('\nDone');
    console.log(`\nNext steps:`);
    console.log(`1. Run enhanced fix-venue-coordinates.cjs to geocode ${result.canGeocode} venues from platform pages`);
    if (result.needManual > 0) {
      console.log(`2. Manually geocode ${result.needManual} venues using the CSV export`);
    }
    process.exit(0);
  })
  .catch(e => {
    console.error('\nFatal error:', e);
    process.exit(1);
  });
