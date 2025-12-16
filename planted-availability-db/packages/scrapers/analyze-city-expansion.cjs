#!/usr/bin/env node
/**
 * Analyze City Expansion Opportunities (v2)
 *
 * Works with the actual venue structure (not discovered_venues)
 *
 * Usage:
 *   node analyze-city-expansion-v2.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function analyzeCityExpansion() {
  console.log('\n=== CITY EXPANSION ANALYSIS ===\n');
  console.log('Finding cities with venues but 0 dishes extracted...\n');

  // Fetch all venues
  const venuesSnap = await db.collection('venues')
    .where('status', '==', 'active')
    .get();

  console.log(`Total active venues: ${venuesSnap.size}`);

  // Fetch all dishes
  const dishesSnap = await db.collection('dishes').get();
  const dishesByVenue = {};
  dishesSnap.forEach(doc => {
    const data = doc.data();
    if (data.venue_id) {
      if (!dishesByVenue[data.venue_id]) {
        dishesByVenue[data.venue_id] = [];
      }
      dishesByVenue[data.venue_id].push({ id: doc.id, ...data });
    }
  });

  console.log(`Total dishes: ${dishesSnap.size}`);
  console.log(`Venues with dishes: ${Object.keys(dishesByVenue).length}\n`);

  // Organize by city
  const cityData = {};

  for (const doc of venuesSnap.docs) {
    const data = doc.data();
    const city = data.address?.city || 'Unknown';
    const country = data.address?.country || 'Unknown';
    const chain = data.chain_id || null;
    const dishCount = (dishesByVenue[doc.id] || []).length;

    // Check for scrapable platform URLs
    const platforms = data.delivery_platforms || [];
    const scrapablePlatforms = platforms.filter(p =>
      p.url && (
        p.platform === 'uber-eats' ||
        p.platform === 'wolt' ||
        p.platform === 'just-eat' ||
        p.platform === 'deliveroo'
      )
    );
    const hasScrapableUrl = scrapablePlatforms.length > 0;

    // Get coordinates for geo-filtering
    const lat = data.location?.latitude || data.location?._latitude || null;
    const lng = data.location?.longitude || data.location?._longitude || null;

    const cityKey = `${city}, ${country}`;

    if (!cityData[cityKey]) {
      cityData[cityKey] = {
        city,
        country,
        totalVenues: 0,
        venuesWithDishes: 0,
        venuesWithoutDishes: 0,
        totalDishes: 0,
        venuesWithScrapableUrls: 0,
        chains: new Set(),
        venues: [],
        latitudes: [],
        longitudes: []
      };
    }

    cityData[cityKey].totalVenues++;
    if (dishCount > 0) {
      cityData[cityKey].venuesWithDishes++;
      cityData[cityKey].totalDishes += dishCount;
    } else {
      cityData[cityKey].venuesWithoutDishes++;
    }
    if (hasScrapableUrl) {
      cityData[cityKey].venuesWithScrapableUrls++;
    }
    if (chain) {
      cityData[cityKey].chains.add(chain);
    }
    if (lat && lng) {
      cityData[cityKey].latitudes.push(lat);
      cityData[cityKey].longitudes.push(lng);
    }

    cityData[cityKey].venues.push({
      id: doc.id,
      name: data.name,
      chain,
      dishCount,
      hasScrapableUrl,
      platforms: scrapablePlatforms,
      lat,
      lng
    });
  }

  // Convert to array and calculate metrics
  const cities = Object.entries(cityData).map(([key, data]) => {
    const coverage = data.totalVenues > 0
      ? (data.venuesWithDishes / data.totalVenues * 100)
      : 0;
    const avgDishes = data.venuesWithDishes > 0
      ? (data.totalDishes / data.venuesWithDishes)
      : 0;
    const chainCount = data.chains.size;

    // Calculate coordinate bounds
    let bounds = null;
    if (data.latitudes.length > 0 && data.longitudes.length > 0) {
      bounds = {
        minLat: Math.min(...data.latitudes),
        maxLat: Math.max(...data.latitudes),
        minLng: Math.min(...data.longitudes),
        maxLng: Math.max(...data.longitudes)
      };
    }

    return {
      ...data,
      coverage,
      avgDishes,
      chainCount,
      chains: Array.from(data.chains),
      bounds
    };
  });

  // Prioritize cities for expansion
  const expansionCandidates = cities.filter(c =>
    c.coverage < 100 && // Not fully covered
    c.venuesWithoutDishes > 0 && // Has venues without dishes
    c.venuesWithScrapableUrls > 0 // Has scrapable URLs
  );

  // Priority scoring
  const priorityCities = expansionCandidates.map(c => {
    let score = 0;

    // Country priority (CH/DE/AT)
    if (c.country === 'CH') score += 100;
    else if (c.country === 'DE') score += 80;
    else if (c.country === 'AT') score += 60;
    else score += 40;

    // Venue count with scrapable URLs
    score += c.venuesWithScrapableUrls * 2;

    // Chain presence (chains make extraction easier)
    score += c.chainCount * 5;

    // Zero coverage gets boost (attack zero!)
    if (c.coverage === 0) score += 50;

    return { ...c, priorityScore: score };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  // Display results
  console.log('='.repeat(80));
  console.log('TOP 20 CITIES FOR EXPANSION (Ordered by Priority)');
  console.log('='.repeat(80));
  console.log('Priority = Country(CH=100/DE=80/AT=60) + ScrapableVenues*2 + Chains*5 + Zero(50)');
  console.log('');

  priorityCities.slice(0, 20).forEach((c, i) => {
    const coverageStr = c.coverage.toFixed(1);
    const status = c.coverage === 0 ? '🎯' : c.coverage < 50 ? '🔴' : '⚠️';

    console.log(`${i + 1}. ${status} ${c.city}, ${c.country} (Score: ${c.priorityScore})`);
    console.log(`   Venues: ${c.totalVenues} total, ${c.venuesWithoutDishes} need dishes (${coverageStr}% covered)`);
    console.log(`   Scrapable: ${c.venuesWithScrapableUrls} venues with extractable URLs`);
    console.log(`   Chains: ${c.chainCount} | Dishes extracted: ${c.totalDishes}`);
    if (c.bounds) {
      console.log(`   Geo bounds: lat[${c.bounds.minLat.toFixed(2)}, ${c.bounds.maxLat.toFixed(2)}], lng[${c.bounds.minLng.toFixed(2)}, ${c.bounds.maxLng.toFixed(2)}]`);
    }
    console.log('');
  });

  // Show detailed breakdown for top 3
  console.log('='.repeat(80));
  console.log('DETAILED BREAKDOWN - TOP 3 CITIES');
  console.log('='.repeat(80));

  for (let i = 0; i < Math.min(3, priorityCities.length); i++) {
    const city = priorityCities[i];
    console.log(`\n${i + 1}. ${city.city}, ${city.country}`);
    console.log('-'.repeat(80));
    console.log(`Priority Score: ${city.priorityScore}`);
    console.log(`Coverage: ${city.coverage.toFixed(1)}% (${city.venuesWithDishes}/${city.totalVenues} venues with dishes)`);
    console.log(`Scrapable venues: ${city.venuesWithScrapableUrls}`);

    if (city.bounds) {
      console.log(`\nGeo-filtering coordinates:`);
      console.log(`  lat > ${city.bounds.minLat.toFixed(4)} && lat < ${city.bounds.maxLat.toFixed(4)}`);
      console.log(`  lng > ${city.bounds.minLng.toFixed(4)} && lng < ${city.bounds.maxLng.toFixed(4)}`);
    }

    // Show venues needing dishes
    const needsDishes = city.venues.filter(v => v.dishCount === 0 && v.hasScrapableUrl);
    console.log(`\nVenues needing dishes (${needsDishes.length}):`);

    needsDishes.slice(0, 10).forEach((v, idx) => {
      const platformNames = v.platforms.map(p => p.platform).join(', ');
      console.log(`  ${idx + 1}. ${v.name}${v.chain ? ` [chain]` : ''}`);
      console.log(`     Platforms: ${platformNames}`);
      console.log(`     URL: ${v.platforms[0]?.url || 'none'}`);
    });

    if (needsDishes.length > 10) {
      console.log(`  ... and ${needsDishes.length - 10} more`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Cities analyzed: ${cities.length}`);
  console.log(`Expansion candidates: ${expansionCandidates.length}`);
  if (priorityCities.length > 0) {
    console.log(`\nTop 10 priority cities:`);
    priorityCities.slice(0, 10).forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.city}, ${c.country} (${c.venuesWithScrapableUrls} scrapable venues, ${c.coverage.toFixed(0)}% covered)`);
    });
  }
  console.log('');
  console.log('Next steps:');
  console.log('1. Create city-specific fetch scripts for top 3 cities');
  console.log('2. Use coordinate bounding boxes for geo-filtering');
  console.log('3. Run with --execute flag after dry-run verification');
  console.log('');
}

analyzeCityExpansion()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
