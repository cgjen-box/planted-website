#!/usr/bin/env node
/**
 * Query CH Discovered Venues
 *
 * Check discovered_venues collection for CH venues that could be promoted
 *
 * Usage:
 *   node query-ch-discovered-venues.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function queryDiscoveredChVenues() {
  console.log('Querying discovered CH venues...\n');

  const discoveredSnap = await db.collection('discovered_venues')
    .where('country', '==', 'CH')
    .get();

  console.log(`Total discovered CH venues: ${discoveredSnap.size}\n`);

  const venues = [];

  for (const doc of discoveredSnap.docs) {
    const data = doc.data();

    const venueInfo = {
      id: doc.id,
      name: data.name,
      city: data.city,
      country: data.country,
      chain: data.chain,
      status: data.status,
      dishCount: data.dishes?.length || 0,
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

    venues.push(venueInfo);
  }

  const withDishes = venues.filter(v => v.dishCount > 0);
  const withoutDishes = venues.filter(v => v.dishCount === 0);
  const withPlatformUrls = venues.filter(v => v.hasPlatformUrl);

  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total discovered CH venues: ${venues.length}`);
  console.log(`Venues with dishes: ${withDishes.length}`);
  console.log(`Venues with 0 dishes: ${withoutDishes.length}`);
  console.log(`Venues with platform URLs: ${withPlatformUrls.length}`);

  // Group by chain
  const chainGroups = {};
  venues.forEach(v => {
    const chain = v.chain || 'no chain';
    if (!chainGroups[chain]) chainGroups[chain] = [];
    chainGroups[chain].push(v);
  });

  console.log('\n' + '='.repeat(60));
  console.log('CHAIN BREAKDOWN');
  console.log('='.repeat(60));

  for (const [chain, venueList] of Object.entries(chainGroups).sort((a, b) => b[1].length - a[1].length)) {
    const withDishesCount = venueList.filter(v => v.dishCount > 0).length;
    const withUrlsCount = venueList.filter(v => v.hasPlatformUrl).length;
    console.log(`${chain}: ${venueList.length} venues (${withDishesCount} with dishes, ${withUrlsCount} with URLs)`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('VENUES WITH DISHES (Already Extracted)');
  console.log('='.repeat(60));

  withDishes.slice(0, 10).forEach((v, i) => {
    console.log(`\n${i + 1}. ${v.name} (${v.city}) - ${v.dishCount} dishes`);
    console.log(`   ID: ${v.id}`);
    console.log(`   Chain: ${v.chain || 'Independent'}`);
  });

  if (withDishes.length > 10) {
    console.log(`\n... and ${withDishes.length - 10} more`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('VENUES WITH PLATFORM URLs (Ready for Extraction)');
  console.log('='.repeat(60));

  const readyForExtraction = withPlatformUrls.filter(v => v.dishCount === 0);

  readyForExtraction.slice(0, 15).forEach((v, i) => {
    const platforms = [];
    if (v.platforms.uber_eats) platforms.push('UberEats');
    if (v.platforms.wolt) platforms.push('Wolt');
    if (v.platforms.lieferando) platforms.push('Lieferando');
    if (v.platforms.just_eat) platforms.push('JustEat');
    if (v.platforms.deliveroo) platforms.push('Deliveroo');

    console.log(`\n${i + 1}. ${v.name} (${v.city}) [${platforms.join(', ')}]`);
    console.log(`   ID: ${v.id}`);
    console.log(`   Chain: ${v.chain || 'Independent'}`);
  });

  if (readyForExtraction.length > 15) {
    console.log(`\n... and ${readyForExtraction.length - 15} more`);
  }

  console.log('\n');
}

queryDiscoveredChVenues()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
