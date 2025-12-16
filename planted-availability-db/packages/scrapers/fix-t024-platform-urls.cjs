#!/usr/bin/env node
/**
 * Fix T024 Platform URLs
 *
 * Add missing delivery platform URLs to 4 venues:
 * - Chupenga (Berlin) - Already has Wolt, verify
 * - Max & Benito (Vienna) - Add Lieferando
 * - Mit&Ohne HB Zürich - Add Uber Eats
 * - Tibits Zürich - Already has Just Eat, add Uber Eats
 *
 * Usage:
 *   node fix-t024-platform-urls.cjs           # Dry run
 *   node fix-t024-platform-urls.cjs --execute # Apply changes
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const DRY_RUN = !process.argv.includes('--execute');

initializeApp({
  credential: cert(path.resolve(__dirname, '../../service-account.json'))
});
const db = getFirestore();

const PLATFORM_UPDATES = [
  {
    venueId: '3thdrRxKneliOrAK23Bm',
    venueName: 'Chupenga - Burritos & Salads Mohrenstrasse',
    country: 'DE',
    city: 'Berlin',
    comment: 'Already has Wolt URL - verify it is correct',
    expectedUrl: 'https://wolt.com/de/deu/berlin/restaurant/chupenga-burritos-salads-mohrenstrasse',
    action: 'verify'
  },
  {
    venueId: 'xUPYEVNG5gmeSBNX5U9B',
    venueName: 'Max & Benito',
    country: 'AT',
    city: 'Vienna',
    comment: 'Add Lieferando URL',
    platformsToAdd: [
      {
        platform: 'lieferando',
        url: 'https://www.lieferando.at/en/max-benito',
        active: true
      }
    ],
    action: 'add'
  },
  {
    venueId: 'Bd7JDajYNhnStKetUtnX',
    venueName: 'Mit&Ohne - HB Zürich',
    country: 'CH',
    city: 'Zürich',
    comment: 'Add Uber Eats URL (currently has HappyCow which is not a delivery platform)',
    platformsToAdd: [
      {
        platform: 'uber-eats',
        url: 'https://www.ubereats.com/ch-de/store/mit&ohne-hb/keyWWVEIVw-KZml7Xmt-Rg',
        active: true
      }
    ],
    action: 'add'
  },
  {
    venueId: 'LxMPQ1oyp0dcQX0MzRBh',
    venueName: 'Tibits Zürich',
    country: 'CH',
    city: 'Zürich',
    comment: 'Already has Just Eat, could add Uber Eats as well',
    platformsToAdd: [
      {
        platform: 'uber-eats',
        url: 'https://www.ubereats.com/ch/city/zürich-zh',
        active: true,
        note: 'Generic Zurich page - need specific Tibits URL if available'
      }
    ],
    action: 'add'
  }
];

async function fixPlatformUrls() {
  console.log('='.repeat(80));
  console.log('T024 PLATFORM URL FIX');
  console.log('='.repeat(80));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}\n`);

  let verifiedCount = 0;
  let addedCount = 0;
  let errorCount = 0;

  for (const update of PLATFORM_UPDATES) {
    console.log('\n' + '-'.repeat(80));
    console.log(`${update.venueName} (${update.city}, ${update.country})`);
    console.log(`Venue ID: ${update.venueId}`);
    console.log(`Action: ${update.action.toUpperCase()}`);
    console.log(`Note: ${update.comment}`);

    try {
      const venueRef = db.collection('venues').doc(update.venueId);
      const venueDoc = await venueRef.get();

      if (!venueDoc.exists) {
        console.log('❌ ERROR: Venue not found');
        errorCount++;
        continue;
      }

      const venueData = venueDoc.data();
      const currentPlatforms = venueData.delivery_platforms || [];

      console.log(`\nCurrent platforms (${currentPlatforms.length}):`);
      if (currentPlatforms.length > 0) {
        currentPlatforms.forEach(p => {
          console.log(`  - ${p.platform}: ${p.url}`);
        });
      } else {
        console.log('  (none)');
      }

      if (update.action === 'verify') {
        const hasExpectedUrl = currentPlatforms.some(p => p.url === update.expectedUrl);
        if (hasExpectedUrl) {
          console.log(`\n✅ VERIFIED: Has expected URL`);
          verifiedCount++;
        } else {
          console.log(`\n⚠️  WARNING: Expected URL not found`);
          console.log(`   Expected: ${update.expectedUrl}`);
        }
      } else if (update.action === 'add') {
        console.log(`\nPlatforms to add (${update.platformsToAdd.length}):`);
        update.platformsToAdd.forEach(p => {
          console.log(`  + ${p.platform}: ${p.url}`);
          if (p.note) {
            console.log(`    Note: ${p.note}`);
          }
        });

        if (!DRY_RUN) {
          // Add new platforms to existing ones
          const updatedPlatforms = [...currentPlatforms, ...update.platformsToAdd];

          await venueRef.update({
            delivery_platforms: updatedPlatforms
          });

          console.log(`\n✅ UPDATED: Added ${update.platformsToAdd.length} platform(s)`);
          addedCount++;
        } else {
          console.log(`\n🔍 DRY RUN: Would add ${update.platformsToAdd.length} platform(s)`);
        }
      }

    } catch (error) {
      console.log(`\n❌ ERROR: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total venues processed: ${PLATFORM_UPDATES.length}`);
  console.log(`Verified: ${verifiedCount}`);
  console.log(`Added: ${addedCount}`);
  console.log(`Errors: ${errorCount}`);

  if (DRY_RUN) {
    console.log('\n🔍 This was a DRY RUN. No changes were made.');
    console.log('Run with --execute to apply changes.');
  } else {
    console.log('\n✅ Changes applied to database.');
  }

  console.log('\n');
}

fixPlatformUrls()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
