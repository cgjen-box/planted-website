/**
 * Sync dishes from promoted discovered_venues to production dishes collection
 *
 * Usage:
 *   node sync-dishes-to-production.cjs                    # Dry run for all promoted venues with dishes
 *   node sync-dishes-to-production.cjs --execute          # Actually sync
 *   node sync-dishes-to-production.cjs VENUE_ID           # Dry run for specific venue
 *   node sync-dishes-to-production.cjs VENUE_ID --execute # Sync specific venue
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

/**
 * Parse price string to Price object
 */
function parsePrice(priceStr, currency) {
  if (!priceStr) return { amount: 0, currency: currency || 'CHF' };

  if (typeof priceStr === 'number') {
    return { amount: priceStr, currency: currency || 'CHF' };
  }

  const match = priceStr.match(/([A-Z]{3}|[€$£])?\s*(\d+(?:[.,]\d+)?)/);
  if (match) {
    const amount = parseFloat(match[2].replace(',', '.'));
    let curr = currency || 'CHF';
    if (match[1]) {
      const symbolMap = { '€': 'EUR', '$': 'USD', '£': 'GBP' };
      curr = symbolMap[match[1]] || match[1];
    }
    return { amount: isNaN(amount) ? 0 : amount, currency: curr };
  }
  return { amount: 0, currency: currency || 'CHF' };
}

async function syncDishesToProduction(targetVenueId, execute) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(execute ? '🚀 EXECUTING DISH SYNC' : '🔍 DRY RUN - No changes will be made');
  console.log(`${'='.repeat(60)}\n`);

  // Build query for promoted venues with production_venue_id
  let query = db.collection('discovered_venues')
    .where('status', '==', 'promoted');

  if (targetVenueId) {
    // Get specific venue
    const venueDoc = await db.collection('discovered_venues').doc(targetVenueId).get();
    if (!venueDoc.exists) {
      console.log('❌ Venue not found:', targetVenueId);
      return;
    }
    const venue = { id: venueDoc.id, ...venueDoc.data() };
    if (venue.status !== 'promoted') {
      console.log('❌ Venue is not promoted:', venue.status);
      return;
    }
    await processVenue(venue, execute);
  } else {
    // Get all promoted venues
    const snapshot = await query.get();
    console.log(`Found ${snapshot.size} promoted venues\n`);

    let processed = 0;
    let synced = 0;
    let totalDishes = 0;

    for (const doc of snapshot.docs) {
      const venue = { id: doc.id, ...doc.data() };
      const result = await processVenue(venue, execute);
      processed++;
      if (result.synced > 0) {
        synced++;
        totalDishes += result.synced;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`Venues processed: ${processed}`);
    console.log(`Venues with new dishes: ${synced}`);
    console.log(`Total dishes ${execute ? 'synced' : 'to sync'}: ${totalDishes}`);
  }
}

async function processVenue(venue, execute) {
  const result = { synced: 0, skipped: 0 };

  if (!venue.production_venue_id) {
    return result;
  }

  if (!venue.dishes || venue.dishes.length === 0) {
    return result;
  }

  // Get existing dishes in production
  const existingDishesSnap = await db.collection('dishes')
    .where('venue_id', '==', venue.production_venue_id)
    .get();

  const existingDishNames = new Set(
    existingDishesSnap.docs.map(d => (d.data().name || '').toLowerCase().trim())
  );

  const dishesToSync = venue.dishes.filter(d =>
    !existingDishNames.has((d.name || '').toLowerCase().trim())
  );

  if (dishesToSync.length === 0) {
    return result;
  }

  console.log(`\n📍 ${venue.name} (${venue.address?.city || 'N/A'})`);
  console.log(`   Discovered ID: ${venue.id}`);
  console.log(`   Production ID: ${venue.production_venue_id}`);
  console.log(`   Existing dishes: ${existingDishesSnap.size}`);
  console.log(`   New dishes to sync: ${dishesToSync.length}`);

  if (execute) {
    const batch = db.batch();

    for (const embeddedDish of dishesToSync) {
      const dishRef = db.collection('dishes').doc();
      const productionDish = {
        venue_id: venue.production_venue_id,
        name: embeddedDish.name,
        description: embeddedDish.description || '',
        planted_products: [embeddedDish.planted_product || embeddedDish.product_sku || 'planted.chicken'],
        price: parsePrice(embeddedDish.price, embeddedDish.currency),
        dietary_tags: embeddedDish.dietary_tags || [],
        availability: { type: 'permanent' },
        source: {
          type: 'discovered',
          partner_id: 'smart-discovery-agent',
        },
        status: 'active',
        last_verified: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };
      // Only add optional fields if they have values
      if (embeddedDish.category) productionDish.cuisine_type = embeddedDish.category;
      if (embeddedDish.image_url) productionDish.image_url = embeddedDish.image_url;
      batch.set(dishRef, productionDish);
      console.log(`   ✅ ${embeddedDish.name} (${parsePrice(embeddedDish.price, embeddedDish.currency).amount} ${parsePrice(embeddedDish.price, embeddedDish.currency).currency})`);
    }

    await batch.commit();
    console.log(`   ✅ Synced ${dishesToSync.length} dishes`);
    result.synced = dishesToSync.length;
  } else {
    for (const dish of dishesToSync) {
      const price = parsePrice(dish.price, dish.currency);
      console.log(`   📝 ${dish.name} (${price.amount} ${price.currency})`);
    }
    result.synced = dishesToSync.length;
  }

  return result;
}

// Parse args
const args = process.argv.slice(2);
const execute = args.includes('--execute');
const venueId = args.find(a => !a.startsWith('--'));

syncDishesToProduction(venueId, execute)
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
