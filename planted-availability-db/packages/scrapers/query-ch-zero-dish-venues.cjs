#!/usr/bin/env node
/**
 * Query CH Zero-Dish Venues
 *
 * Identifies CH restaurants that need dish extraction.
 * Focuses on venues with platform URLs (Uber Eats, Wolt, Lieferando, etc.)
 *
 * Usage:
 *   node query-ch-zero-dish-venues.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function queryChVenues() {
  console.log('Querying CH venues with 0 dishes...\n');

  const venuesSnap = await db.collection('venues')
    .where('address.country', '==', 'CH')
    .get();

  const zeroDishVenues = [];
  const withDishVenues = [];

  for (const doc of venuesSnap.docs) {
    const data = doc.data();

    // Skip non-restaurants
    if (data.type !== 'restaurant') continue;

    // Count dishes
    const dishSnap = await db.collection('dishes')
      .where('venue_id', '==', doc.id)
      .get();

    const dishCount = dishSnap.size;

    const venueInfo = {
      id: doc.id,
      name: data.name,
      city: data.address?.city,
      country: data.address?.country,
      type: data.type,
      chain: data.chain,
      status: data.status,
      dishCount,
      platforms: {
        uber_eats: data.platform_urls?.uber_eats || null,
        wolt: data.platform_urls?.wolt || null,
        lieferando: data.platform_urls?.lieferando || null,
        just_eat: data.platform_urls?.just_eat || null,
        deliveroo: data.platform_urls?.deliveroo || null,
      },
      hasPlatformUrl: !!(
        data.platform_urls?.uber_eats ||
        data.platform_urls?.wolt ||
        data.platform_urls?.lieferando ||
        data.platform_urls?.just_eat ||
        data.platform_urls?.deliveroo
      )
    };

    if (dishCount === 0) {
      zeroDishVenues.push(venueInfo);
    } else {
      withDishVenues.push(venueInfo);
    }
  }

  // Sort by priority: venues with platform URLs first
  zeroDishVenues.sort((a, b) => {
    if (a.hasPlatformUrl && !b.hasPlatformUrl) return -1;
    if (!a.hasPlatformUrl && b.hasPlatformUrl) return 1;
    return 0;
  });

  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total CH restaurants: ${venuesSnap.size}`);
  console.log(`Restaurants with dishes: ${withDishVenues.length}`);
  console.log(`Restaurants with 0 dishes: ${zeroDishVenues.length}`);

  const withPlatformUrls = zeroDishVenues.filter(v => v.hasPlatformUrl);
  const withoutPlatformUrls = zeroDishVenues.filter(v => !v.hasPlatformUrl);

  console.log(`  - With platform URLs: ${withPlatformUrls.length}`);
  console.log(`  - Without platform URLs: ${withoutPlatformUrls.length}`);

  // Group by chain
  const chainGroups = {};
  zeroDishVenues.forEach(v => {
    const chain = v.chain || 'no chain';
    if (!chainGroups[chain]) chainGroups[chain] = [];
    chainGroups[chain].push(v);
  });

  console.log('\n' + '='.repeat(60));
  console.log('CHAIN BREAKDOWN (Zero-Dish Venues)');
  console.log('='.repeat(60));

  for (const [chain, venues] of Object.entries(chainGroups).sort((a, b) => b[1].length - a[1].length)) {
    const withUrls = venues.filter(v => v.hasPlatformUrl).length;
    console.log(`\n${chain} (${venues.length} venues, ${withUrls} with platform URLs):`);

    // Show first 5 venues
    venues.slice(0, 5).forEach(v => {
      const platforms = [];
      if (v.platforms.uber_eats) platforms.push('UberEats');
      if (v.platforms.wolt) platforms.push('Wolt');
      if (v.platforms.lieferando) platforms.push('Lieferando');
      if (v.platforms.just_eat) platforms.push('JustEat');
      if (v.platforms.deliveroo) platforms.push('Deliveroo');

      const platformStr = platforms.length > 0 ? `[${platforms.join(', ')}]` : '[No platform URLs]';
      console.log(`  - ${v.name} (${v.city}) ${platformStr}`);
      console.log(`    ID: ${v.id}`);
    });

    if (venues.length > 5) {
      console.log(`  ... and ${venues.length - 5} more`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TOP PRIORITY VENUES (With Platform URLs)');
  console.log('='.repeat(60));

  withPlatformUrls.slice(0, 15).forEach((v, i) => {
    const platforms = [];
    if (v.platforms.uber_eats) platforms.push(`UberEats: ${v.platforms.uber_eats}`);
    if (v.platforms.wolt) platforms.push(`Wolt: ${v.platforms.wolt}`);
    if (v.platforms.lieferando) platforms.push(`Lieferando: ${v.platforms.lieferando}`);
    if (v.platforms.just_eat) platforms.push(`JustEat: ${v.platforms.just_eat}`);
    if (v.platforms.deliveroo) platforms.push(`Deliveroo: ${v.platforms.deliveroo}`);

    console.log(`\n${i + 1}. ${v.name} (${v.city})`);
    console.log(`   ID: ${v.id}`);
    console.log(`   Chain: ${v.chain || 'Independent'}`);
    platforms.forEach(p => console.log(`   - ${p}`));
  });

  console.log('\n');
}

queryChVenues()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
