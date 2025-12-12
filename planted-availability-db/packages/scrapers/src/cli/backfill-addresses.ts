#!/usr/bin/env npx tsx

/**
 * Backfill Script: Fill Missing Venue Addresses
 *
 * This script backfills missing street addresses for production venues by:
 * 1. Finding venues with empty/missing street addresses
 * 2. Fetching venue pages from their delivery platform URLs
 * 3. Using platform adapters to extract full address data
 * 4. Updating venues with the extracted addresses
 *
 * Usage:
 *   npx tsx src/cli/backfill-addresses.ts [--dry-run] [--limit N]
 *
 * Options:
 *   --dry-run  Preview changes without writing to database
 *   --limit N  Process at most N venues (default: 100)
 */

// Load environment variables
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../..'); // planted-availability-db/

// Load .env files
dotenv.config({ path: path.resolve(rootDir, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Fix relative GOOGLE_APPLICATION_CREDENTIALS path
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path.isAbsolute(credPath)) {
    const resolvedPath = path.resolve(rootDir, credPath);
    if (fs.existsSync(resolvedPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = resolvedPath;
    }
  }
}

import { initializeFirestore, getFirestore } from '@pad/database';
import type { DeliveryPlatform } from '@pad/core';
import { platformAdapters } from '../agents/smart-discovery/platforms/index.js';

initializeFirestore();
const db = getFirestore();

interface BackfillResult {
  venueId: string;
  venueName: string;
  platform: string;
  oldAddress: string;
  newAddress?: string;
  status: 'updated' | 'skipped' | 'no_url' | 'fetch_failed' | 'no_address' | 'error';
  error?: string;
}

/**
 * Detect platform from URL
 */
function detectPlatformFromUrl(url: string): DeliveryPlatform | null {
  if (url.includes('ubereats.com')) return 'uber-eats';
  if (url.includes('just-eat') || url.includes('eat.ch')) return 'just-eat';
  if (url.includes('lieferando')) return 'lieferando';
  if (url.includes('wolt.com')) return 'wolt';
  if (url.includes('smood.ch')) return 'smood';
  if (url.includes('deliveroo.')) return 'deliveroo';
  if (url.includes('glovoapp.') || url.includes('glovo.')) return 'glovo';
  return null;
}

/**
 * Format address for display
 */
function formatAddress(address: { street?: string; city?: string; postal_code?: string; country?: string }): string {
  const parts: string[] = [];
  if (address.street) parts.push(address.street);
  const cityPart = [address.postal_code, address.city].filter(Boolean).join(' ');
  if (cityPart) parts.push(cityPart);
  if (address.country) parts.push(address.country);
  return parts.join(', ') || 'N/A';
}

/**
 * Fetch venue page with retry
 */
async function fetchVenuePage(url: string, retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!response.ok) {
        if (attempt < retries) {
          console.log(`    Retry ${attempt + 1}/${retries} after ${response.status}...`);
          await delay(2000);
          continue;
        }
        return null;
      }

      return await response.text();
    } catch (error) {
      if (attempt < retries) {
        console.log(`    Retry ${attempt + 1}/${retries} after error...`);
        await delay(2000);
        continue;
      }
      return null;
    }
  }
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBackfill(dryRun: boolean, limit: number): Promise<void> {
  console.log('\n📍 Address Backfill Script');
  console.log('='.repeat(50));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be written)'}`);
  console.log(`Limit: ${limit} venues\n`);

  // Query venues with missing street addresses
  console.log('Querying venues with missing street addresses...');

  // First, try to get venues where street is empty string
  const emptyStreetSnapshot = await db.collection('venues')
    .where('address.street', '==', '')
    .limit(limit)
    .get();

  // Also get venues where street doesn't exist (null/undefined)
  // Firestore doesn't support != null directly, so we get more and filter
  const allVenuesSnapshot = await db.collection('venues')
    .limit(limit * 2)  // Get more to filter
    .get();

  // Combine and dedupe
  const venueMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();

  emptyStreetSnapshot.docs.forEach(doc => venueMap.set(doc.id, doc));

  allVenuesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const street = data.address?.street;
    if (!street || street.trim() === '') {
      venueMap.set(doc.id, doc);
    }
  });

  const venuesToProcess = Array.from(venueMap.values()).slice(0, limit);
  console.log(`Found ${venuesToProcess.length} venues with missing street addresses\n`);

  if (venuesToProcess.length === 0) {
    console.log('No venues need address backfill.');
    return;
  }

  const results: BackfillResult[] = [];
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < venuesToProcess.length; i++) {
    const doc = venuesToProcess[i];
    const data = doc.data();
    const result: BackfillResult = {
      venueId: doc.id,
      venueName: data.name || 'Unknown',
      platform: 'unknown',
      oldAddress: formatAddress(data.address || {}),
      status: 'skipped',
    };

    console.log(`[${i + 1}/${venuesToProcess.length}] Processing: ${result.venueName}`);

    try {
      // Get source URL from delivery_platforms
      const deliveryPlatforms = data.delivery_platforms || [];
      const firstPlatform = deliveryPlatforms[0];

      if (!firstPlatform?.url) {
        result.status = 'no_url';
        skippedCount++;
        console.log(`  ⚠️ No delivery platform URL found`);
        results.push(result);
        continue;
      }

      const sourceUrl = firstPlatform.url;
      const platform = detectPlatformFromUrl(sourceUrl);
      result.platform = platform || 'unknown';

      if (!platform) {
        result.status = 'no_url';
        result.error = `Unknown platform for URL: ${sourceUrl}`;
        skippedCount++;
        console.log(`  ⚠️ Unknown platform: ${sourceUrl}`);
        results.push(result);
        continue;
      }

      const adapter = platformAdapters[platform];
      if (!adapter) {
        result.status = 'no_url';
        result.error = `No adapter for platform: ${platform}`;
        skippedCount++;
        console.log(`  ⚠️ No adapter for platform: ${platform}`);
        results.push(result);
        continue;
      }

      // Fetch the venue page
      console.log(`  Fetching from ${platform}...`);
      const html = await fetchVenuePage(sourceUrl);

      if (!html) {
        result.status = 'fetch_failed';
        result.error = 'Failed to fetch page';
        errorCount++;
        console.log(`  ❌ Failed to fetch page`);
        results.push(result);
        await delay(1000); // Rate limit
        continue;
      }

      // Parse the venue page to extract address
      const venuePageData = adapter.parseVenuePage(html);

      if (!venuePageData.address?.street) {
        result.status = 'no_address';
        result.error = 'No street address found in page';
        skippedCount++;
        console.log(`  ⚠️ No street address found in page data`);
        results.push(result);
        await delay(1000);
        continue;
      }

      // Build the new address
      const newAddress = {
        street: venuePageData.address.street,
        city: venuePageData.address.city || data.address?.city || '',
        postal_code: venuePageData.address.postal_code || data.address?.postal_code || '',
        country: venuePageData.address.country || data.address?.country || '',
      };

      result.newAddress = formatAddress(newAddress);
      result.status = 'updated';

      console.log(`  ✅ Found: ${newAddress.street}, ${newAddress.city}`);

      // Update venue if not dry run
      if (!dryRun) {
        const updates: Record<string, unknown> = {
          'address.street': newAddress.street,
          updated_at: new Date(),
        };

        if (newAddress.postal_code && !data.address?.postal_code) {
          updates['address.postal_code'] = newAddress.postal_code;
        }
        if (newAddress.city && (!data.address?.city || data.address.city === 'Unknown')) {
          updates['address.city'] = newAddress.city;
        }

        // Also update coordinates if available
        if (venuePageData.coordinates) {
          updates['location.latitude'] = venuePageData.coordinates.latitude;
          updates['location.longitude'] = venuePageData.coordinates.longitude;
          console.log(`  📍 Also updated coordinates: ${venuePageData.coordinates.latitude}, ${venuePageData.coordinates.longitude}`);
        }

        await doc.ref.update(updates);
      }

      updatedCount++;
      results.push(result);

      // Rate limit
      await delay(1500);
    } catch (error) {
      result.status = 'error';
      result.error = error instanceof Error ? error.message : String(error);
      errorCount++;
      console.log(`  ❌ Error: ${result.error}`);
      results.push(result);
      await delay(1000);
    }
  }

  // Print summary
  console.log('\n📊 Backfill Summary');
  console.log('='.repeat(50));
  console.log(`Total processed:  ${venuesToProcess.length}`);
  console.log(`✅ Updated: ${updatedCount}`);
  console.log(`⚠️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  // Print updated venues
  const updatedVenues = results.filter(r => r.status === 'updated');
  if (updatedVenues.length > 0) {
    console.log('\n✅ Updated Venues:');
    console.log('-'.repeat(50));
    for (const venue of updatedVenues.slice(0, 20)) { // Show first 20
      console.log(`\n  ${venue.venueName} (${venue.venueId})`);
      console.log(`    Old: ${venue.oldAddress}`);
      console.log(`    New: ${venue.newAddress}`);
    }
    if (updatedVenues.length > 20) {
      console.log(`\n  ... and ${updatedVenues.length - 20} more`);
    }
  }

  // Print skipped venues
  const skippedVenues = results.filter(r => r.status === 'no_address' || r.status === 'no_url');
  if (skippedVenues.length > 0) {
    console.log('\n⚠️  Skipped Venues:');
    console.log('-'.repeat(50));
    for (const venue of skippedVenues.slice(0, 10)) { // Show first 10
      console.log(`  ${venue.venueName}: ${venue.error || venue.status}`);
    }
    if (skippedVenues.length > 10) {
      console.log(`  ... and ${skippedVenues.length - 10} more`);
    }
  }

  // Print errors
  const errorVenues = results.filter(r => r.status === 'error' || r.status === 'fetch_failed');
  if (errorVenues.length > 0) {
    console.log('\n❌ Errors:');
    console.log('-'.repeat(50));
    for (const venue of errorVenues.slice(0, 10)) {
      console.log(`  ${venue.venueName}: ${venue.error}`);
    }
    if (errorVenues.length > 10) {
      console.log(`  ... and ${errorVenues.length - 10} more`);
    }
  }

  if (dryRun) {
    console.log('\n⚡ This was a dry run. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Backfill complete!');
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 && args[limitIndex + 1]
  ? parseInt(args[limitIndex + 1], 10)
  : 100;

// Main execution
runBackfill(dryRun, limit)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
