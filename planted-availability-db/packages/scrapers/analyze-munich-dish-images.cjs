#!/usr/bin/env node
/**
 * Analyze Munich Dish Images
 * Check which dishes have images and which don't
 */

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

async function analyzeMunichDishImages() {
  console.log('\n=== MUNICH DISH IMAGES ANALYSIS ===\n');

  // Get German venues
  const venuesSnap = await db.collection('venues')
    .where('address.country', '==', 'DE')
    .where('status', '==', 'active')
    .get();

  const allVenues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Filter to Munich area (lat ~48.14, lng ~11.58)
  const munichVenues = allVenues.filter(v => {
    const lat = v.location?.latitude || v.location?._latitude || 0;
    const lng = v.location?.longitude || v.location?._longitude || 0;
    // Within ~20km of Munich center
    return lat > 47.95 && lat < 48.35 && lng > 11.35 && lng < 11.80;
  });

  console.log(`Found ${munichVenues.length} Munich-area venues\n`);

  // Get all dishes
  const dishesSnap = await db.collection('dishes').get();
  const allDishes = dishesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Analyze by venue
  let totalDishes = 0;
  let dishesWithImages = 0;
  let dishesWithoutImages = 0;
  const venuesMissingImages = [];

  for (const venue of munichVenues) {
    const venueDishes = allDishes.filter(d => d.venue_id === venue.id);
    if (venueDishes.length === 0) continue;

    const withImages = venueDishes.filter(d => d.image_url);
    const withoutImages = venueDishes.filter(d => !d.image_url);

    totalDishes += venueDishes.length;
    dishesWithImages += withImages.length;
    dishesWithoutImages += withoutImages.length;

    if (withoutImages.length > 0) {
      venuesMissingImages.push({
        venue,
        totalDishes: venueDishes.length,
        withImages: withImages.length,
        withoutImages: withoutImages.length,
        missingDishes: withoutImages,
        deliveryPlatforms: venue.delivery_platforms || []
      });
    }
  }

  console.log('=== SUMMARY ===');
  console.log(`Total dishes: ${totalDishes}`);
  console.log(`With images: ${dishesWithImages} (${Math.round(dishesWithImages/totalDishes*100)}%)`);
  console.log(`Without images: ${dishesWithoutImages} (${Math.round(dishesWithoutImages/totalDishes*100)}%)`);
  console.log(`\nVenues with missing images: ${venuesMissingImages.length}\n`);

  console.log('=== VENUES NEEDING IMAGES ===\n');

  // Sort by most dishes without images
  venuesMissingImages.sort((a, b) => b.withoutImages - a.withoutImages);

  for (const { venue, totalDishes, withImages, withoutImages, missingDishes, deliveryPlatforms } of venuesMissingImages) {
    console.log(`\n📍 ${venue.name} (${venue.address?.city})`);
    console.log(`   Dishes: ${withImages}/${totalDishes} have images (${withoutImages} missing)`);

    // Show delivery platforms
    const platforms = deliveryPlatforms.map(p => p.platform).join(', ') || 'None';
    console.log(`   Platforms: ${platforms}`);

    // Show which dishes need images
    console.log(`   Missing images for:`);
    missingDishes.forEach(dish => {
      console.log(`     - ${dish.name} (${dish.id})`);
    });

    // Show platform URLs that could be scraped
    if (deliveryPlatforms.length > 0) {
      console.log(`   Platform URLs:`);
      deliveryPlatforms.forEach(p => {
        console.log(`     ${p.platform}: ${p.url}`);
      });
    }
  }

  // Return data for further processing
  return venuesMissingImages;
}

analyzeMunichDishImages()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
