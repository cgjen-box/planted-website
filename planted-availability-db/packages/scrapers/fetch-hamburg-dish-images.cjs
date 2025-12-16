#!/usr/bin/env node
/**
 * Fetch Dish Images for Hamburg Restaurants
 * Scrapes images from Uber Eats, Wolt, Just Eat and updates dishes in Firestore
 *
 * Usage:
 *   node fetch-hamburg-dish-images.cjs                    # Dry run - show what would be fetched
 *   node fetch-hamburg-dish-images.cjs --execute          # Actually fetch and update images
 *   node fetch-hamburg-dish-images.cjs --venue=<id>       # Process specific venue only
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const https = require('https');
const http = require('http');

// Initialize Firebase Admin
initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

const EXECUTE = process.argv.includes('--execute');
const venueArg = process.argv.find(a => a.startsWith('--venue='));
const SPECIFIC_VENUE = venueArg ? venueArg.split('=')[1] : null;

// Hamburg coordinates (expanded bounds to include nearby areas)
const HAMBURG_BOUNDS = {
  minLat: 53.4,
  maxLat: 54.8,
  minLng: 9.3,
  maxLng: 10.3
};

// Fetch page content
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    };

    protocol.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Extract dish images from Uber Eats page
function extractUberEatsImages(html, dishNames) {
  const images = new Map();

  // Look for __NEXT_DATA__ JSON
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const findMenuItems = (obj, items = []) => {
        if (!obj || typeof obj !== 'object') return items;

        if ((obj.title || obj.name) && obj.imageUrl) {
          items.push({ name: obj.title || obj.name, imageUrl: obj.imageUrl });
        }

        for (const key of Object.keys(obj)) {
          findMenuItems(obj[key], items);
        }
        return items;
      };

      const menuItems = findMenuItems(data);

      // Match with our dish names
      for (const dishName of dishNames) {
        const normalizedDish = dishName.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const item of menuItems) {
          const normalizedItem = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalizedItem.includes(normalizedDish) || normalizedDish.includes(normalizedItem)) {
            images.set(dishName, item.imageUrl);
            break;
          }
        }
      }
    } catch (e) {
      console.log('    Could not parse __NEXT_DATA__');
    }
  }

  // Fallback: look for Uber Eats image URLs
  if (images.size === 0) {
    const imgPattern = /https:\/\/tb-static\.uber\.com\/prod\/image-proc\/processed_images\/[^"'\s]+/g;
    const allImages = [...new Set(html.match(imgPattern) || [])];

    let i = 0;
    for (const dishName of dishNames) {
      if (!images.has(dishName) && i < allImages.length) {
        images.set(dishName, allImages[i]);
        i++;
      }
    }
  }

  return images;
}

// Extract dish images from Wolt page
function extractWoltImages(html, dishNames) {
  const images = new Map();

  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const findMenuItems = (obj, items = []) => {
        if (!obj || typeof obj !== 'object') return items;

        if ((obj.name || obj.title) && obj.image) {
          items.push({ name: obj.name || obj.title, imageUrl: obj.image });
        }

        for (const key of Object.keys(obj)) {
          findMenuItems(obj[key], items);
        }
        return items;
      };

      const menuItems = findMenuItems(data);

      for (const dishName of dishNames) {
        const normalizedDish = dishName.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const item of menuItems) {
          const normalizedItem = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalizedItem.includes(normalizedDish) || normalizedDish.includes(normalizedItem)) {
            images.set(dishName, item.imageUrl);
            break;
          }
        }
      }
    } catch (e) {
      console.log('    Could not parse Wolt __NEXT_DATA__');
    }
  }

  // Fallback: look for Wolt CDN images
  if (images.size === 0) {
    const imgPattern = /https:\/\/[^"'\s]*wolt[^"'\s]*\.(?:jpg|jpeg|png|webp)[^"'\s]*/gi;
    const allImages = [...new Set(html.match(imgPattern) || [])];

    let i = 0;
    for (const dishName of dishNames) {
      if (!images.has(dishName) && i < allImages.length) {
        images.set(dishName, allImages[i]);
        i++;
      }
    }
  }

  return images;
}

// Extract dish images from Just Eat/Lieferando page
function extractJustEatImages(html, dishNames) {
  const images = new Map();

  // Note: Lieferando/Just Eat are JS-rendered, so this may not work well
  // Look for JSON-LD data
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/g);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const json = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const data = JSON.parse(json);
        if (data.hasMenu && data.hasMenu.hasMenuSection) {
          for (const section of data.hasMenu.hasMenuSection) {
            if (section.hasMenuItem) {
              for (const item of section.hasMenuItem) {
                if (item.name && item.image) {
                  for (const dishName of dishNames) {
                    const normalizedDish = dishName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const normalizedItem = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normalizedItem.includes(normalizedDish) || normalizedDish.includes(normalizedItem)) {
                      images.set(dishName, item.image);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }

  return images;
}

async function fetchHamburgDishImages() {
  console.log('\n=== FETCH HAMBURG DISH IMAGES ===\n');
  console.log(`Mode: ${EXECUTE ? '🔥 EXECUTE' : '🔍 DRY RUN'}`);
  if (SPECIFIC_VENUE) console.log(`Venue: ${SPECIFIC_VENUE}`);
  console.log('');

  // Get all venues
  const venuesSnap = await db.collection('venues')
    .where('address.country', '==', 'DE')
    .where('status', '==', 'active')
    .get();

  const allVenues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Filter to Hamburg area
  let hamburgVenues = allVenues.filter(v => {
    const lat = v.location?.latitude || v.location?._latitude || 0;
    const lng = v.location?.longitude || v.location?._longitude || 0;
    return lat > HAMBURG_BOUNDS.minLat && lat < HAMBURG_BOUNDS.maxLat &&
           lng > HAMBURG_BOUNDS.minLng && lng < HAMBURG_BOUNDS.maxLng;
  });

  if (SPECIFIC_VENUE) {
    hamburgVenues = hamburgVenues.filter(v => v.id === SPECIFIC_VENUE);
  }

  console.log(`Found ${hamburgVenues.length} Hamburg venues\n`);

  // Get all dishes for these venues
  const allDishesSnap = await db.collection('dishes').get();
  const allDishes = allDishesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  let totalUpdated = 0;
  let totalFailed = 0;
  let venuesProcessed = 0;

  for (const venue of hamburgVenues) {
    const venueDishes = allDishes.filter(d => d.venue_id === venue.id && !d.image_url);
    if (venueDishes.length === 0) continue;

    const platforms = venue.delivery_platforms || [];
    // Filter to scrapable platforms (not Lieferando which is JS-rendered)
    const scrapablePlatforms = platforms.filter(p =>
      p.url && (p.platform === 'uber-eats' || p.platform === 'wolt')
    );

    if (scrapablePlatforms.length === 0) {
      console.log(`\n⚠️  ${venue.name} - No scrapable platforms (${venueDishes.length} dishes), skipping`);
      totalFailed += venueDishes.length;
      continue;
    }

    console.log(`\n📍 ${venue.name} (${venueDishes.length} dishes need images)`);
    venuesProcessed++;

    // Try each platform
    let imagesFound = false;
    for (const platform of scrapablePlatforms) {
      console.log(`   Trying ${platform.platform}: ${platform.url}`);

      try {
        const html = await fetchPage(platform.url);
        const dishNames = venueDishes.map(d => d.name);

        let images = new Map();
        if (platform.platform === 'uber-eats') {
          images = extractUberEatsImages(html, dishNames);
        } else if (platform.platform === 'wolt') {
          images = extractWoltImages(html, dishNames);
        } else if (platform.platform === 'just-eat') {
          images = extractJustEatImages(html, dishNames);
        }

        if (images.size > 0) {
          console.log(`   Found ${images.size} images`);

          for (const dish of venueDishes) {
            const imageUrl = images.get(dish.name);
            if (imageUrl) {
              console.log(`     ✓ ${dish.name}`);

              if (EXECUTE) {
                await db.collection('dishes').doc(dish.id).update({
                  image_url: imageUrl
                });
              }
              totalUpdated++;
            } else {
              console.log(`     ✗ ${dish.name} - no match`);
              totalFailed++;
            }
          }

          imagesFound = true;
          break; // Got images from this platform, no need to try others
        } else {
          console.log(`   No images found on ${platform.platform}`);
        }
      } catch (err) {
        console.log(`   Error fetching ${platform.platform}: ${err.message}`);
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!imagesFound) {
      totalFailed += venueDishes.length;
    }
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`Venues processed: ${venuesProcessed}`);
  console.log(`Images ${EXECUTE ? 'updated' : 'found'}: ${totalUpdated}`);
  console.log(`Failed to match: ${totalFailed}`);

  if (!EXECUTE && totalUpdated > 0) {
    console.log('\n💡 Run with --execute to update the database');
  }
}

fetchHamburgDishImages()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
