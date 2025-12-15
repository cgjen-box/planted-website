#!/usr/bin/env node
/**
 * Copy New Chain Dishes
 *
 * Copy dishes from source venues to all other chain venues.
 * Works with venues that have dishes embedded in venue documents.
 *
 * Usage:
 *   node copy-new-chain-dishes.cjs                # Dry run
 *   node copy-new-chain-dishes.cjs --execute      # Actually copy
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

// Source venues with dishes (mixed from discovered_venues and venues collections)
const SOURCE_VENUES = [
  {
    chain: 'Vapiano',
    sourceId: 'cJJSREy1R4tpkrFgIgwD',
    sourceCollection: 'discovered_venues',
    targetNamePattern: 'vapiano'
  },
  {
    chain: 'Barburrito',
    sourceId: 'oSzz3yB3IMc6PvFMLWVH',
    sourceCollection: 'discovered_venues',
    targetNamePattern: 'barburrito'
  },
  {
    chain: 'NENI',
    sourceId: '6ZOimYI3lDQ9c8bEO6Sm',
    sourceCollection: 'venues',
    targetNamePattern: 'neni',
    chainId: 'neni-restaurants'
  }
];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    execute: args.includes('--execute')
  };
}

async function getSourceDishes(sourceId, sourceCollection) {
  const doc = await db.collection(sourceCollection).doc(sourceId).get();

  if (!doc.exists) {
    throw new Error(`Source venue ${sourceId} not found in ${sourceCollection}`);
  }

  const data = doc.data();
  if (!data.dishes || data.dishes.length === 0) {
    throw new Error(`Source venue ${sourceId} has no dishes`);
  }

  return {
    name: data.name,
    dishes: data.dishes
  };
}

async function getTargetVenues(pattern, chainId) {
  const targets = [];

  // Search in venues collection
  const venuesSnap = await db.collection('venues')
    .where('name', '>=', pattern.charAt(0).toUpperCase() + pattern.slice(1))
    .where('name', '<=', pattern.charAt(0).toUpperCase() + pattern.slice(1) + '\uf8ff')
    .get();

  for (const doc of venuesSnap.docs) {
    const venue = doc.data();
    const name = (venue.name || '').toLowerCase();

    if (name.includes(pattern.toLowerCase())) {
      targets.push({
        id: doc.id,
        collection: 'venues',
        name: venue.name,
        city: venue.address?.city || venue.city || 'N/A',
        hasDishes: !!(venue.dishes && venue.dishes.length > 0)
      });
    }
  }

  // Also search by chain_id if provided
  if (chainId) {
    const chainSnap = await db.collection('venues')
      .where('chain_id', '==', chainId)
      .get();

    for (const doc of chainSnap.docs) {
      // Check if already added
      if (!targets.find(t => t.id === doc.id)) {
        const venue = doc.data();
        targets.push({
          id: doc.id,
          collection: 'venues',
          name: venue.name,
          city: venue.address?.city || venue.city || 'N/A',
          hasDishes: !!(venue.dishes && venue.dishes.length > 0)
        });
      }
    }
  }

  return targets;
}

async function copyDishesToVenue(dishes, targetId, targetCollection, execute) {
  if (!execute) {
    return dishes.length;
  }

  const venueRef = db.collection(targetCollection).doc(targetId);
  await venueRef.update({
    dishes: dishes,
    updated_at: new Date()
  });

  return dishes.length;
}

async function copyNewChainDishes() {
  const { execute } = parseArgs();

  console.log('\n' + '='.repeat(60));
  console.log(execute ? 'EXECUTING CHAIN DISH COPY' : 'DRY RUN - No changes will be made');
  console.log('='.repeat(60) + '\n');

  let totalCopied = 0;
  let totalVenuesUpdated = 0;
  let errors = 0;

  for (const source of SOURCE_VENUES) {
    console.log(`\n Processing: ${source.chain}`);
    console.log('-'.repeat(40));

    try {
      // Get source dishes
      const sourceData = await getSourceDishes(source.sourceId, source.sourceCollection);
      console.log(`   Source: ${sourceData.name} - ${sourceData.dishes.length} dishes`);

      // Get target venues
      const targets = await getTargetVenues(source.targetNamePattern, source.chainId);
      const targetsWithoutDishes = targets.filter(t => !t.hasDishes && t.id !== source.sourceId);

      console.log(`   Total chain venues: ${targets.length}`);
      console.log(`   Venues needing dishes: ${targetsWithoutDishes.length}\n`);

      if (targetsWithoutDishes.length === 0) {
        console.log(`   All ${source.chain} venues already have dishes`);
        continue;
      }

      // Copy to each target
      for (const target of targetsWithoutDishes) {
        try {
          const copied = await copyDishesToVenue(
            sourceData.dishes,
            target.id,
            target.collection,
            execute
          );

          console.log(`   ${execute ? 'Copied' : 'Would copy'} ${copied} dishes to ${target.name} (${target.city})`);
          totalCopied += copied;
          totalVenuesUpdated++;
        } catch (e) {
          console.log(`   Error copying to ${target.name}: ${e.message}`);
          errors++;
        }
      }
    } catch (e) {
      console.log(`   Error processing ${source.chain}: ${e.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Chains processed: ${SOURCE_VENUES.length}`);
  console.log(`Venues updated: ${totalVenuesUpdated}`);
  console.log(`Dishes ${execute ? 'copied' : 'would copy'}: ${totalCopied}`);
  console.log(`Errors: ${errors}`);

  if (!execute && totalCopied > 0) {
    console.log(`\n To actually copy, run:`);
    console.log(`   node copy-new-chain-dishes.cjs --execute`);
  }

  return { totalCopied, totalVenuesUpdated, errors };
}

copyNewChainDishes()
  .then(result => {
    console.log('\n✓ Done');
    process.exit(result.errors > 0 ? 1 : 0);
  })
  .catch(e => {
    console.error('\n✗ Fatal error:', e);
    process.exit(1);
  });
