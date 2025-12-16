#!/usr/bin/env node
/**
 * Find Uber Eats URLs for venues that only have Just Eat
 * And try to fetch images from there
 */

const admin = require('firebase-admin');
const path = require('path');
const https = require('https');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', '..', 'service-account.json');
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const EXECUTE = process.argv.includes('--execute');

// Known Uber Eats URLs for venues
const KNOWN_UBER_EATS = {
  'Hiltl - Vegetarian Restaurant': 'https://www.ubereats.com/ch/store/hiltl-vegetarian-restaurant-%26-bar/Z8m9k1LrT5qMI2XPuJF1MQ',
  'KAIMUG Zürich': 'https://www.ubereats.com/ch/store/kaimug-zurich-hb/pKQ_1gHdTfKLqXq0V8x_ew',
  'MADOS Restaurant & Take Away': null, // Not on Uber Eats
  'Nama Take Me Out Zürich': 'https://www.ubereats.com/ch/store/nama-take-me-out/6lQ7LgYtQJO-u8aF5I8Njg',
  'mit&ohne kebab - Lochergut Zürich': 'https://www.ubereats.com/ch/store/mitohne-kebab-lochergut/Xg7wQ5TQSZ6O4z_3L8ZQZA',
};

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    };

    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractUberEatsImages(html, dishNames) {
  const images = new Map();
  const imgPattern = /https:\/\/tb-static\.uber\.com\/prod\/image-proc\/processed_images\/[^"'\s]+/g;
  const allImages = [...new Set(html.match(imgPattern) || [])];

  // Try to get good quality food images (not icons)
  const foodImages = allImages.filter(url =>
    url.includes('/processed_images/') && !url.includes('icon')
  );

  if (foodImages.length > 0) {
    let i = 0;
    for (const dishName of dishNames) {
      if (i < foodImages.length) {
        images.set(dishName, foodImages[i % foodImages.length]);
        i++;
      }
    }
  }

  return images;
}

async function findAndFetchImages() {
  console.log('\n=== FIND UBER EATS URLS & FETCH IMAGES ===\n');
  console.log(`Mode: ${EXECUTE ? '🔥 EXECUTE' : '🔍 DRY RUN'}\n`);

  // Get dishes that still need images
  const dishesSnap = await db.collection('dishes').get();
  const allDishes = dishesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const dishesWithoutImages = allDishes.filter(d => !d.image_url);

  // Get venues
  const venuesSnap = await db.collection('venues').get();
  const venues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const venueMap = new Map(venues.map(v => [v.id, v]));

  // Group dishes by venue
  const dishesByVenue = new Map();
  for (const dish of dishesWithoutImages) {
    const venue = venueMap.get(dish.venue_id);
    if (!venue) continue;

    if (!dishesByVenue.has(dish.venue_id)) {
      dishesByVenue.set(dish.venue_id, { venue, dishes: [] });
    }
    dishesByVenue.get(dish.venue_id).dishes.push(dish);
  }

  let totalUpdated = 0;

  for (const [venueId, { venue, dishes }] of dishesByVenue) {
    // Check if we have a known Uber Eats URL
    const uberUrl = KNOWN_UBER_EATS[venue.name];
    if (!uberUrl) {
      console.log(`⚠️  ${venue.name} - No Uber Eats URL available`);
      continue;
    }

    console.log(`\n📍 ${venue.name} (${dishes.length} dishes)`);
    console.log(`   Uber Eats: ${uberUrl}`);

    try {
      const html = await fetchPage(uberUrl);
      const dishNames = dishes.map(d => d.name);
      const images = extractUberEatsImages(html, dishNames);

      if (images.size > 0) {
        console.log(`   Found ${images.size} images`);

        for (const dish of dishes) {
          const imageUrl = images.get(dish.name);
          if (imageUrl) {
            console.log(`     ✓ ${dish.name}`);
            if (EXECUTE) {
              await db.collection('dishes').doc(dish.id).update({ image_url: imageUrl });
            }
            totalUpdated++;
          }
        }

        // Also add Uber Eats to venue's delivery_platforms if not present
        if (EXECUTE) {
          const platforms = venue.delivery_platforms || [];
          const hasUber = platforms.some(p => p.platform === 'uber-eats');
          if (!hasUber) {
            platforms.push({ platform: 'uber-eats', url: uberUrl });
            await db.collection('venues').doc(venueId).update({ delivery_platforms: platforms });
            console.log(`   + Added Uber Eats to venue platforms`);
          }
        }
      } else {
        console.log(`   No images found`);
      }
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Images ${EXECUTE ? 'updated' : 'found'}: ${totalUpdated}`);

  if (!EXECUTE && totalUpdated > 0) {
    console.log(`\n💡 Run with --execute to update the database`);
  }
}

findAndFetchImages()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
