#!/usr/bin/env node
/**
 * Fix Venue Coordinates V2 - Enhanced with Platform Scraping
 *
 * Discovery venues often have 0,0 coordinates but valid addresses.
 * Salesforce venues have valid coordinates but no dishes.
 *
 * Strategy (two-tier approach):
 * 1. Try to match with Salesforce venue by name + city (fast, free)
 * 2. If no match and venue has delivery platform URL, scrape coordinates from platform page
 *
 * Usage:
 *   node fix-venue-coordinates-v2.cjs                    # Dry run
 *   node fix-venue-coordinates-v2.cjs --execute          # Actually fix
 *   node fix-venue-coordinates-v2.cjs --execute --scrape-only  # Only use platform scraping
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, GeoPoint } = require('firebase-admin/firestore');
const path = require('path');
const https = require('https');
const http = require('http');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    execute: args.includes('--execute'),
    scrapeOnly: args.includes('--scrape-only'),
    limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : null,
  };
}

function normalizeForMatch(str) {
  return (str || '').toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

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

async function fetchUrl(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    };

    const req = protocol.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects > 0) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          resolve(fetchUrl(redirectUrl, maxRedirects - 1));
          return;
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function extractCoordinatesFromHtml(html, platform) {
  try {
    // Method 1: Uber Eats - look for __REDUX_STATE__
    if (platform === 'uber-eats') {
      const reduxMatch = html.match(/__REDUX_STATE__\s*=\s*({.+?});/);
      if (reduxMatch) {
        const state = JSON.parse(reduxMatch[1]);
        const storeInfo = state?.storeInfo;
        if (storeInfo?.location?.latitude && storeInfo?.location?.longitude) {
          return {
            latitude: storeInfo.location.latitude,
            longitude: storeInfo.location.longitude,
            method: 'redux_state'
          };
        }
      }
    }

    // Method 2: Lieferando/Just Eat - look for __NEXT_DATA__
    if (platform === 'lieferando' || platform === 'just-eat') {
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
      if (nextDataMatch) {
        const nextData = JSON.parse(nextDataMatch[1]);

        // Navigate the JSON structure to find restaurant data
        const findInObject = (obj, keys) => {
          if (!obj || typeof obj !== 'object') return null;

          for (const [key, value] of Object.entries(obj)) {
            if (keys.some(k => key.toLowerCase().includes(k))) {
              if (value?.location?.lat && value?.location?.lng) {
                return { latitude: value.location.lat, longitude: value.location.lng };
              }
              if (value?.location?.latitude && value?.location?.longitude) {
                return { latitude: value.location.latitude, longitude: value.location.longitude };
              }
              if (value?.lat && value?.lng) {
                return { latitude: value.lat, longitude: value.lng };
              }
            }

            if (typeof value === 'object') {
              const result = findInObject(value, keys);
              if (result) return result;
            }
          }
          return null;
        };

        const coords = findInObject(nextData, ['restaurant', 'venue', 'store', 'location']);
        if (coords) {
          return { ...coords, method: 'next_data' };
        }
      }
    }

    // Method 3: Wolt - look for structured data
    if (platform === 'wolt') {
      const scriptMatch = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s);
      if (scriptMatch) {
        try {
          const data = JSON.parse(scriptMatch[1]);
          if (data.geo?.latitude && data.geo?.longitude) {
            return {
              latitude: data.geo.latitude,
              longitude: data.geo.longitude,
              method: 'ld_json'
            };
          }
          if (data['@type'] === 'Restaurant' && data.address?.geo) {
            return {
              latitude: data.address.geo.latitude,
              longitude: data.address.geo.longitude,
              method: 'ld_json'
            };
          }
        } catch (e) {
          // JSON parse failed, continue
        }
      }
    }

    // Method 4: Generic - look for any lat/lng in JSON blobs
    const jsonMatches = html.matchAll(/\{[^}]*(?:latitude|lat)[^}]*(?:longitude|lng)[^}]*\}/gi);
    for (const match of jsonMatches) {
      try {
        const obj = JSON.parse(match[0]);
        const lat = obj.latitude || obj.lat;
        const lng = obj.longitude || obj.lng;
        if (typeof lat === 'number' && typeof lng === 'number' &&
            Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
            Math.abs(lat) > 1 && Math.abs(lng) > 1) {
          return { latitude: lat, longitude: lng, method: 'generic_json' };
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixCoordinates() {
  const { execute, scrapeOnly, limit } = parseArgs();

  console.log(`\n${'='.repeat(70)}`);
  console.log(execute ? 'EXECUTING COORDINATE FIX V2' : 'DRY RUN - No changes will be made');
  if (scrapeOnly) console.log('MODE: Platform scraping only (no Salesforce matching)');
  if (limit) console.log(`LIMIT: Processing max ${limit} venues`);
  console.log(`${'='.repeat(70)}\n`);

  // Load all venues
  const venuesSnap = await db.collection('venues').get();
  console.log(`Loaded ${venuesSnap.size} venues\n`);

  // Separate into discovery (random ID) and Salesforce (planted- prefix)
  const discoveryVenues = [];
  const salesforceVenues = [];

  for (const doc of venuesSnap.docs) {
    const v = doc.data();
    v.id = doc.id;

    if (doc.id.startsWith('planted-')) {
      if (hasValidLocation(v)) {
        salesforceVenues.push(v);
      }
    } else {
      discoveryVenues.push(v);
    }
  }

  console.log(`Salesforce venues with valid coords: ${salesforceVenues.length}`);
  console.log(`Discovery venues: ${discoveryVenues.length}\n`);

  // Build lookup index by normalized name+city (if not scrape-only)
  const sfIndex = {};
  if (!scrapeOnly) {
    for (const v of salesforceVenues) {
      const key = normalizeForMatch(v.name) + ':' + normalizeForMatch(v.address?.city || v.city);
      if (!sfIndex[key]) sfIndex[key] = [];
      sfIndex[key].push(v);
    }
  }

  // Find discovery venues needing coordinate fix
  let fixedViaSalesforce = 0;
  let fixedViaScraping = 0;
  let noMatch = 0;
  let scrapeFailed = 0;
  let errors = 0;
  let processed = 0;

  for (const discVenue of discoveryVenues) {
    if (hasValidLocation(discVenue)) continue; // Already has valid coords

    // Check if has dishes
    const dishSnap = await db.collection('dishes')
      .where('venue_id', '==', discVenue.id)
      .count()
      .get();

    if (dishSnap.data().count === 0) continue; // Skip venues without dishes

    if (limit && processed >= limit) {
      console.log(`\nReached limit of ${limit} venues\n`);
      break;
    }
    processed++;

    const venueName = discVenue.name;
    const venueCity = discVenue.address?.city || discVenue.city || 'Unknown';

    // TIER 1: Try Salesforce matching (unless scrape-only)
    if (!scrapeOnly) {
      const key = normalizeForMatch(venueName) + ':' + normalizeForMatch(venueCity);
      const matches = sfIndex[key];

      if (matches && matches.length > 0) {
        const sfVenue = matches[0];
        const lat = sfVenue.location.latitude;
        const lng = sfVenue.location.longitude;

        console.log(`✓ SF Match: ${venueName} (${venueCity})`);
        console.log(`  Copy coords from ${sfVenue.id}: ${lat}, ${lng}`);

        if (execute) {
          try {
            await db.collection('venues').doc(discVenue.id).update({
              location: new GeoPoint(lat, lng)
            });
            console.log(`  Fixed!`);
            fixedViaSalesforce++;
          } catch (e) {
            console.log(`  Error: ${e.message}`);
            errors++;
          }
        } else {
          console.log(`  Would fix`);
          fixedViaSalesforce++;
        }
        continue;
      }
    }

    // TIER 2: Try platform scraping
    const deliveryPlatforms = discVenue.delivery_platforms || [];
    const firstPlatform = deliveryPlatforms[0];

    if (!firstPlatform?.url) {
      console.log(`✗ No match: ${venueName} (${venueCity}) - No platform URL`);
      noMatch++;
      continue;
    }

    const platform = detectPlatformFromUrl(firstPlatform.url);
    if (!platform) {
      console.log(`✗ No match: ${venueName} (${venueCity}) - Unknown platform`);
      noMatch++;
      continue;
    }

    console.log(`→ Scraping: ${venueName} (${venueCity}) from ${platform}...`);

    try {
      const html = await fetchUrl(firstPlatform.url);
      const coords = extractCoordinatesFromHtml(html, platform);

      if (coords) {
        console.log(`  ✓ Found coords: ${coords.latitude}, ${coords.longitude} (via ${coords.method})`);

        if (execute) {
          await db.collection('venues').doc(discVenue.id).update({
            location: new GeoPoint(coords.latitude, coords.longitude)
          });
          console.log(`  Fixed!`);
          fixedViaScraping++;
        } else {
          console.log(`  Would fix`);
          fixedViaScraping++;
        }
      } else {
        console.log(`  ✗ Could not extract coordinates from HTML`);
        scrapeFailed++;
      }

      // Rate limiting
      await delay(1000);
    } catch (e) {
      console.log(`  ✗ Scrape failed: ${e.message}`);
      scrapeFailed++;
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`${execute ? 'Fixed' : 'Would fix'} via Salesforce match: ${fixedViaSalesforce}`);
  console.log(`${execute ? 'Fixed' : 'Would fix'} via platform scraping: ${fixedViaScraping}`);
  console.log(`Total ${execute ? 'fixed' : 'would fix'}: ${fixedViaSalesforce + fixedViaScraping}`);
  console.log(`No match/URL: ${noMatch}`);
  console.log(`Scraping failed: ${scrapeFailed}`);
  console.log(`Errors: ${errors}`);

  if (!execute && (fixedViaSalesforce + fixedViaScraping) > 0) {
    console.log(`\nTo actually fix, run:`);
    console.log(`   node fix-venue-coordinates-v2.cjs --execute`);
  }

  // Export venues that couldn't be fixed
  if (noMatch + scrapeFailed > 0) {
    console.log(`\n${noMatch + scrapeFailed} venues could not be geocoded automatically.`);
    console.log(`You can export them to CSV for manual geocoding by running:`);
    console.log(`   node analyze-coordinates.cjs`);
  }

  return {
    fixedViaSalesforce,
    fixedViaScraping,
    noMatch,
    scrapeFailed,
    errors
  };
}

fixCoordinates()
  .then(result => {
    console.log('\nDone');
    process.exit(result.errors > 0 ? 1 : 0);
  })
  .catch(e => {
    console.error('\nFatal error:', e);
    process.exit(1);
  });
