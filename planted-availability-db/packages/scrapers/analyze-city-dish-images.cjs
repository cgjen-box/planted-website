#!/usr/bin/env node
/**
 * Analyze City Dish Image Coverage
 *
 * Identifies cities where dishes exist but lack images.
 * Prioritizes by: venue count, country (CH/DE/AT priority), chain presence.
 *
 * Usage:
 *   node analyze-city-dish-images.cjs
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

async function analyzeCityDishImages() {
  console.log('\n=== CITY DISH IMAGE COVERAGE ANALYSIS ===\n');
  console.log('Finding cities with dishes but missing images...\n');

  // Fetch all venues
  const venuesSnap = await db.collection('venues')
    .where('status', '==', 'active')
    .get();

  console.log(`Total active venues: ${venuesSnap.size}`);

  // Fetch all dishes
  const dishesSnap = await db.collection('dishes').get();
  const dishesByVenue = {};
  let totalDishes = 0;
  let totalWithImages = 0;

  dishesSnap.forEach(doc => {
    const data = doc.data();
    totalDishes++;
    if (data.image_url) totalWithImages++;

    if (data.venue_id) {
      if (!dishesByVenue[data.venue_id]) {
        dishesByVenue[data.venue_id] = [];
      }
      dishesByVenue[data.venue_id].push({
        id: doc.id,
        name: data.name,
        hasImage: !!data.image_url,
        imageUrl: data.image_url
      });
    }
  });

  console.log(`Total dishes: ${totalDishes}`);
  console.log(`Dishes with images: ${totalWithImages} (${(totalWithImages / totalDishes * 100).toFixed(1)}%)`);
  console.log(`Dishes without images: ${totalDishes - totalWithImages}\n`);

  // Organize by city
  const cityData = {};

  for (const doc of venuesSnap.docs) {
    const data = doc.data();
    const city = data.address?.city || 'Unknown';
    const country = data.address?.country || 'Unknown';
    const chain = data.chain_id || null;
    const dishes = dishesByVenue[doc.id] || [];
    const dishesWithImages = dishes.filter(d => d.hasImage).length;
    const dishesWithoutImages = dishes.filter(d => !d.hasImage).length;

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
        venuesNeedingImages: 0,
        totalDishes: 0,
        dishesWithImages: 0,
        dishesWithoutImages: 0,
        chains: new Set(),
        venues: [],
        latitudes: [],
        longitudes: []
      };
    }

    cityData[cityKey].totalVenues++;
    if (dishes.length > 0) {
      cityData[cityKey].venuesWithDishes++;
      cityData[cityKey].totalDishes += dishes.length;
      cityData[cityKey].dishesWithImages += dishesWithImages;
      cityData[cityKey].dishesWithoutImages += dishesWithoutImages;

      if (dishesWithoutImages > 0 && hasScrapableUrl) {
        cityData[cityKey].venuesNeedingImages++;
      }
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
      dishes: dishes.length,
      dishesWithImages,
      dishesWithoutImages,
      hasScrapableUrl,
      platforms: scrapablePlatforms,
      lat,
      lng
    });
  }

  // Convert to array and calculate metrics
  const cities = Object.entries(cityData).map(([key, data]) => {
    const imageCoverage = data.totalDishes > 0
      ? (data.dishesWithImages / data.totalDishes * 100)
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
      imageCoverage,
      chainCount,
      chains: Array.from(data.chains),
      bounds
    };
  });

  // Prioritize cities for image extraction
  const expansionCandidates = cities.filter(c =>
    c.imageCoverage < 100 && // Not fully covered
    c.dishesWithoutImages > 0 && // Has dishes without images
    c.venuesNeedingImages > 0 // Has venues with scrapable URLs
  );

  // Priority scoring
  const priorityCities = expansionCandidates.map(c => {
    let score = 0;

    // Country priority (CH/DE/AT)
    if (c.country === 'CH') score += 100;
    else if (c.country === 'DE') score += 80;
    else if (c.country === 'AT') score += 60;
    else score += 40;

    // Number of dishes needing images
    score += c.dishesWithoutImages * 1;

    // Venue count with scrapable URLs
    score += c.venuesNeedingImages * 2;

    // Chain presence (chains make extraction easier)
    score += c.chainCount * 5;

    // Low coverage gets boost
    if (c.imageCoverage < 50) score += 30;

    return { ...c, priorityScore: score };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  // Display results
  console.log('='.repeat(80));
  console.log('TOP 20 CITIES FOR DISH IMAGE EXTRACTION (Ordered by Priority)');
  console.log('='.repeat(80));
  console.log('Priority = Country + DishesNeedingImages + Venues*2 + Chains*5 + LowCoverage(30)');
  console.log('');

  priorityCities.slice(0, 20).forEach((c, i) => {
    const coverageStr = c.imageCoverage.toFixed(1);
    const status = c.imageCoverage === 0 ? '🎯' :
                   c.imageCoverage < 50 ? '🔴' :
                   c.imageCoverage < 80 ? '⚠️' : '✅';

    console.log(`${i + 1}. ${status} ${c.city}, ${c.country} (Score: ${c.priorityScore})`);
    console.log(`   Image coverage: ${coverageStr}% (${c.dishesWithImages}/${c.totalDishes} dishes)`);
    console.log(`   Dishes needing images: ${c.dishesWithoutImages} across ${c.venuesNeedingImages} venues`);
    console.log(`   Chains: ${c.chainCount} | Total venues: ${c.venuesWithDishes}`);
    if (c.bounds) {
      console.log(`   Geo: lat[${c.bounds.minLat.toFixed(2)}, ${c.bounds.maxLat.toFixed(2)}], lng[${c.bounds.minLng.toFixed(2)}, ${c.bounds.maxLng.toFixed(2)}]`);
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
    console.log(`Image Coverage: ${city.imageCoverage.toFixed(1)}% (${city.dishesWithImages}/${city.totalDishes} dishes with images)`);
    console.log(`Dishes needing images: ${city.dishesWithoutImages}`);
    console.log(`Venues needing image extraction: ${city.venuesNeedingImages}`);

    if (city.bounds) {
      console.log(`\nGeo-filtering coordinates:`);
      console.log(`  lat > ${city.bounds.minLat.toFixed(4)} && lat < ${city.bounds.maxLat.toFixed(4)}`);
      console.log(`  lng > ${city.bounds.minLng.toFixed(4)} && lng < ${city.bounds.maxLng.toFixed(4)}`);
    }

    // Show venues needing images
    const needsImages = city.venues.filter(v => v.dishesWithoutImages > 0 && v.hasScrapableUrl);
    console.log(`\nVenues with dishes needing images (${needsImages.length}):`);

    needsImages.slice(0, 10).forEach((v, idx) => {
      const platformNames = v.platforms.map(p => p.platform).join(', ');
      console.log(`  ${idx + 1}. ${v.name}${v.chain ? ` [chain]` : ''}`);
      console.log(`     Dishes: ${v.dishesWithImages}/${v.dishes} have images (${v.dishesWithoutImages} need)`);
      console.log(`     Platforms: ${platformNames}`);
      if (v.platforms[0]?.url) {
        console.log(`     URL: ${v.platforms[0].url}`);
      }
    });

    if (needsImages.length > 10) {
      console.log(`  ... and ${needsImages.length - 10} more`);
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
      console.log(`  ${i + 1}. ${c.city}, ${c.country} - ${c.dishesWithoutImages} dishes need images (${c.imageCoverage.toFixed(0)}% coverage)`);
    });
  }
  console.log('');
  console.log('Next steps:');
  console.log('1. Create/update city-specific fetch scripts for top 3 cities');
  console.log('2. Use coordinate bounding boxes for geo-filtering');
  console.log('3. Run with --execute flag after dry-run verification');
  console.log('');
}

analyzeCityDishImages()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
