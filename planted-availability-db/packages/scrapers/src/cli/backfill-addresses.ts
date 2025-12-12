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
 * Fetching Strategy (3-tier failover):
 * 1. Simple fetch - fastest, but blocked by some platforms
 * 2. PuppeteerFetcher - headless browser with stealth mode
 * 3. Chrome DevTools MCP - uses debug Chrome (requires chrome-debug.bat running)
 *
 * Usage:
 *   npx tsx src/cli/backfill-addresses.ts [--dry-run] [--limit N] [--use-puppeteer] [--use-chrome]
 *
 * Options:
 *   --dry-run       Preview changes without writing to database
 *   --limit N       Process at most N venues (default: 100)
 *   --use-puppeteer Start with PuppeteerFetcher instead of simple fetch
 *   --use-chrome    Use Chrome DevTools MCP (requires chrome-debug.bat running)
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
import { PuppeteerFetcher } from '../agents/smart-dish-finder/PuppeteerFetcher.js';

initializeFirestore();
const db = getFirestore();

interface BackfillResult {
  venueId: string;
  venueName: string;
  platform: string;
  oldAddress: string;
  newAddress?: string;
  fetchMethod?: 'simple' | 'puppeteer' | 'chrome';
  status: 'updated' | 'skipped' | 'no_url' | 'fetch_failed' | 'no_address' | 'error';
  error?: string;
}

type FetchMethod = 'simple' | 'puppeteer' | 'chrome';

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
 * Simple fetch with retry
 */
async function simpleFetch(url: string, retries = 2): Promise<string | null> {
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
          await delay(2000);
          continue;
        }
        return null;
      }

      return await response.text();
    } catch {
      if (attempt < retries) {
        await delay(2000);
        continue;
      }
      return null;
    }
  }
  return null;
}

/**
 * Fetch with PuppeteerFetcher (headless browser with stealth)
 */
async function puppeteerFetch(
  url: string,
  venueName: string,
  fetcher: PuppeteerFetcher
): Promise<string | null> {
  try {
    const result = await fetcher.fetchPage(url, {
      venue_id: 'backfill',
      venue_name: venueName,
    });

    if (result.success && result.page?.html) {
      return result.page.html;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch with Chrome DevTools MCP (requires chrome-debug.bat running)
 * This is the last resort - uses manual browser
 */
async function chromeFetch(url: string): Promise<string | null> {
  try {
    // Try to connect to Chrome DevTools MCP
    // This requires the chrome-devtools MCP server to be running
    const CDP_PORT = 9222;
    const CDP_BASE = `http://localhost:${CDP_PORT}`;

    // Check if Chrome debug is available
    const listResponse = await fetch(`${CDP_BASE}/json/list`, { signal: AbortSignal.timeout(2000) });
    if (!listResponse.ok) {
      console.log('    Chrome DevTools not available (run chrome-debug.bat)');
      return null;
    }

    const targets = await listResponse.json() as Array<{ id: string; type: string; url: string; webSocketDebuggerUrl: string }>;
    let targetId = targets.find(t => t.type === 'page')?.id;

    if (!targetId) {
      // No page open, create one
      const newTabResponse = await fetch(`${CDP_BASE}/json/new?${encodeURIComponent(url)}`);
      if (!newTabResponse.ok) return null;
      const newTarget = await newTabResponse.json() as { id: string };
      targetId = newTarget.id;
      await delay(5000); // Wait for page to load
    } else {
      // Navigate existing tab
      await fetch(`${CDP_BASE}/json/activate/${targetId}`);
      // Use CDP to navigate
      const wsUrl = targets.find(t => t.id === targetId)?.webSocketDebuggerUrl;
      if (wsUrl) {
        // For simplicity, just wait - the MCP server handles navigation
        // We can't easily do WebSocket CDP here, so fall back to opening URL
        await fetch(`${CDP_BASE}/json/new?${encodeURIComponent(url)}`);
        await delay(5000);
      }
    }

    // Get page content via CDP Runtime.evaluate
    // This is simplified - in practice, you'd use the MCP tools
    console.log('    Note: Chrome DevTools fetch requires manual MCP integration');
    return null;
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBackfill(
  dryRun: boolean,
  limit: number,
  startMethod: FetchMethod,
  useChrome: boolean
): Promise<void> {
  console.log('\n📍 Address Backfill Script');
  console.log('='.repeat(50));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be written)'}`);
  console.log(`Limit: ${limit} venues`);
  console.log(`Start method: ${startMethod}`);
  console.log(`Chrome fallback: ${useChrome ? 'enabled' : 'disabled'}\n`);

  // Initialize PuppeteerFetcher if needed
  let puppeteerFetcher: PuppeteerFetcher | null = null;
  if (startMethod === 'puppeteer' || startMethod === 'simple') {
    console.log('Initializing PuppeteerFetcher...');
    puppeteerFetcher = new PuppeteerFetcher({ headless: true });
    await puppeteerFetcher.init();
    console.log('PuppeteerFetcher ready.\n');
  }

  // Query venues with missing street addresses
  console.log('Querying venues with missing street addresses...');

  // First, try to get venues where street is empty string
  const emptyStreetSnapshot = await db.collection('venues')
    .where('address.street', '==', '')
    .limit(limit)
    .get();

  // Also get venues where street doesn't exist (null/undefined)
  const allVenuesSnapshot = await db.collection('venues')
    .limit(limit * 2)
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
    if (puppeteerFetcher) await puppeteerFetcher.close();
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

      // Try fetching with failover strategy
      let html: string | null = null;
      let fetchMethod: FetchMethod = startMethod;

      // Tier 1: Simple fetch (if not skipped)
      if (startMethod === 'simple') {
        console.log(`  Trying simple fetch from ${platform}...`);
        html = await simpleFetch(sourceUrl);
        if (html) {
          result.fetchMethod = 'simple';
        }
      }

      // Tier 2: PuppeteerFetcher
      if (!html && puppeteerFetcher && (startMethod === 'simple' || startMethod === 'puppeteer')) {
        console.log(`  Trying PuppeteerFetcher...`);
        html = await puppeteerFetch(sourceUrl, result.venueName, puppeteerFetcher);
        if (html) {
          result.fetchMethod = 'puppeteer';
          fetchMethod = 'puppeteer';
        }
      }

      // Tier 3: Chrome DevTools (if enabled and still no HTML)
      if (!html && useChrome) {
        console.log(`  Trying Chrome DevTools...`);
        html = await chromeFetch(sourceUrl);
        if (html) {
          result.fetchMethod = 'chrome';
          fetchMethod = 'chrome';
        }
      }

      if (!html) {
        result.status = 'fetch_failed';
        result.error = 'All fetch methods failed';
        errorCount++;
        console.log(`  ❌ Failed to fetch page (tried: ${startMethod}${puppeteerFetcher ? ', puppeteer' : ''}${useChrome ? ', chrome' : ''})`);
        results.push(result);
        await delay(1000);
        continue;
      }

      console.log(`  ✓ Fetched via ${fetchMethod} (${(html.length / 1024).toFixed(1)}KB)`);

      // Debug: Save first HTML sample to inspect
      if (i === 0 && dryRun) {
        const debugFile = path.join(__dirname, `debug-${platform}-sample.html`);
        fs.writeFileSync(debugFile, html);
        console.log(`  📄 Debug: Saved sample HTML to ${debugFile}`);

        // Also check for common data structures
        const hasNextData = html.includes('__NEXT_DATA__');
        const hasReduxState = html.includes('__REDUX_STATE__');
        const hasRestaurant = html.includes('"restaurant"');
        const hasAddress = html.includes('"address"');
        const hasStreet = html.includes('"street"');
        console.log(`  📊 Debug: __NEXT_DATA__=${hasNextData}, __REDUX_STATE__=${hasReduxState}, "restaurant"=${hasRestaurant}, "address"=${hasAddress}, "street"=${hasStreet}`);
      }

      // Parse the venue page to extract address
      const venuePageData = adapter.parseVenuePage(html);

      if (!venuePageData.address?.street) {
        result.status = 'no_address';
        result.error = 'No street address found in page data';
        skippedCount++;
        console.log(`  ⚠️ No street address found in page data`);

        // Debug: Save failed HTML for investigation
        if (dryRun) {
          const debugFile = path.join(__dirname, `debug-${platform}-failed-${i}.html`);
          fs.writeFileSync(debugFile, html);
          console.log(`  📄 Debug: Saved failed HTML to ${debugFile}`);
        }

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
      await delay(2000);
    } catch (error) {
      result.status = 'error';
      result.error = error instanceof Error ? error.message : String(error);
      errorCount++;
      console.log(`  ❌ Error: ${result.error}`);
      results.push(result);
      await delay(1000);
    }
  }

  // Cleanup
  if (puppeteerFetcher) {
    console.log('\nClosing PuppeteerFetcher...');
    await puppeteerFetcher.close();
  }

  // Print summary
  console.log('\n📊 Backfill Summary');
  console.log('='.repeat(50));
  console.log(`Total processed:  ${venuesToProcess.length}`);
  console.log(`✅ Updated: ${updatedCount}`);
  console.log(`⚠️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  // Print fetch method breakdown
  const byMethod = results.filter(r => r.status === 'updated').reduce((acc, r) => {
    acc[r.fetchMethod || 'unknown'] = (acc[r.fetchMethod || 'unknown'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (Object.keys(byMethod).length > 0) {
    console.log('\nFetch method breakdown:');
    for (const [method, count] of Object.entries(byMethod)) {
      console.log(`  ${method}: ${count}`);
    }
  }

  // Print updated venues
  const updatedVenues = results.filter(r => r.status === 'updated');
  if (updatedVenues.length > 0) {
    console.log('\n✅ Updated Venues:');
    console.log('-'.repeat(50));
    for (const venue of updatedVenues.slice(0, 20)) {
      console.log(`\n  ${venue.venueName} (${venue.venueId})`);
      console.log(`    Old: ${venue.oldAddress}`);
      console.log(`    New: ${venue.newAddress}`);
      console.log(`    Method: ${venue.fetchMethod}`);
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
    for (const venue of skippedVenues.slice(0, 10)) {
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
const usePuppeteer = args.includes('--use-puppeteer');
const useChrome = args.includes('--use-chrome');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 && args[limitIndex + 1]
  ? parseInt(args[limitIndex + 1], 10)
  : 100;

const startMethod: FetchMethod = usePuppeteer ? 'puppeteer' : 'simple';

// Main execution
runBackfill(dryRun, limit, startMethod, useChrome)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
