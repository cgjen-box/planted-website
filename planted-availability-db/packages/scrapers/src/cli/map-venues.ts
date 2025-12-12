#!/usr/bin/env npx tsx

/**
 * Map Venues Script
 *
 * Phase 2 of 100% Dish Coverage Plan:
 * 1. Get all production venues from venues collection
 * 2. For each, find corresponding discovered_venue via production_venue_id backlink
 * 3. Output JSON map for extraction phase
 * 4. Log any orphaned production venues (no discovered venue link)
 *
 * Usage:
 *   npx tsx src/cli/map-venues.ts --output venue-map.json
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../..');

dotenv.config({ path: path.resolve(rootDir, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path.isAbsolute(credPath)) {
    const resolvedPath = path.resolve(rootDir, credPath);
    if (fs.existsSync(resolvedPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = resolvedPath;
    }
  }
}

import { initializeFirestore, getFirestore, venues, discoveredVenues } from '@pad/database';

initializeFirestore();
const db = getFirestore();

interface VenueMapping {
  productionVenueId: string;
  productionVenueName: string;
  discoveredVenueId: string;
  discoveredVenueName: string;
  city: string;
  country: string;
  embeddedDishCount: number;
  deliveryPlatforms: string[];
  websiteUrl?: string;
}

interface VenueMap {
  timestamp: string;
  totalProduction: number;
  totalMapped: number;
  totalOrphaned: number;
  mappings: VenueMapping[];
  orphaned: { id: string; name: string; city: string }[];
}

interface CLIOptions {
  output?: string;
  help: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--output':
      case '-o':
        if (nextArg && !nextArg.startsWith('-')) {
          options.output = nextArg;
          i++;
        }
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Map Venues Script

Phase 2 of 100% Dish Coverage Plan - Map production venues to discovered venues.

Usage:
  npx tsx src/cli/map-venues.ts --output <filename>

Options:
  --output, -o <file>   Output file for venue map JSON (required)
  --help, -h            Show this help

Examples:
  npx tsx src/cli/map-venues.ts --output venue-map.json
`);
}

async function run(options: CLIOptions): Promise<void> {
  console.log('\n🗺️  Map Venues Script');
  console.log('='.repeat(50));

  if (!options.output) {
    console.error('❌ Error: --output <filename> is required');
    showHelp();
    process.exit(1);
  }

  // Step 1: Get all production venues
  console.log('\n📍 Step 1: Fetching production venues...');
  const allProductionVenues = await venues.getAll();
  console.log(`   Found ${allProductionVenues.length} production venues\n`);

  // Step 2: Get all discovered venues with production_venue_id
  console.log('🔍 Step 2: Fetching discovered venues...');
  const allDiscoveredVenues = await discoveredVenues.getAll();
  console.log(`   Found ${allDiscoveredVenues.length} discovered venues\n`);

  // Build a map: production_venue_id -> discovered_venue
  const productionToDiscovered = new Map<string, typeof allDiscoveredVenues[0]>();
  for (const dv of allDiscoveredVenues) {
    if (dv.production_venue_id) {
      productionToDiscovered.set(dv.production_venue_id, dv);
    }
  }
  console.log(`   ${productionToDiscovered.size} discovered venues have production_venue_id\n`);

  // Step 3: Map each production venue
  console.log('🔗 Step 3: Mapping venues...');
  const venueMap: VenueMap = {
    timestamp: new Date().toISOString(),
    totalProduction: allProductionVenues.length,
    totalMapped: 0,
    totalOrphaned: 0,
    mappings: [],
    orphaned: [],
  };

  for (const pv of allProductionVenues) {
    const dv = productionToDiscovered.get(pv.id);

    if (dv) {
      venueMap.mappings.push({
        productionVenueId: pv.id,
        productionVenueName: pv.name,
        discoveredVenueId: dv.id,
        discoveredVenueName: dv.name,
        city: dv.address?.city || pv.address?.city || 'Unknown',
        country: dv.address?.country || pv.address?.country || 'Unknown',
        embeddedDishCount: dv.dishes?.length || 0,
        deliveryPlatforms: dv.delivery_platforms?.map((dp) => dp.platform) || [],
        websiteUrl: dv.delivery_platforms?.find((dp) => dp.platform === 'website')?.url,
      });
      venueMap.totalMapped++;
    } else {
      venueMap.orphaned.push({
        id: pv.id,
        name: pv.name,
        city: pv.address?.city || 'Unknown',
      });
      venueMap.totalOrphaned++;
    }
  }

  // Sort mappings by city for easier review
  venueMap.mappings.sort((a, b) => a.city.localeCompare(b.city));

  // Step 4: Write output
  console.log('\n📝 Step 4: Writing venue map...');
  const outputPath = path.resolve(process.cwd(), options.output);
  fs.writeFileSync(outputPath, JSON.stringify(venueMap, null, 2));
  console.log(`   ✅ Saved to: ${outputPath}\n`);

  // Summary
  console.log('📊 Summary');
  console.log('='.repeat(50));
  console.log(`Total production venues:     ${venueMap.totalProduction}`);
  console.log(`Successfully mapped:         ${venueMap.totalMapped} (${Math.round(venueMap.totalMapped / venueMap.totalProduction * 100)}%)`);
  console.log(`Orphaned (no discovered):    ${venueMap.totalOrphaned}`);

  // Show embedded dish distribution
  const withDishes = venueMap.mappings.filter((m) => m.embeddedDishCount > 0);
  const totalEmbedded = venueMap.mappings.reduce((sum, m) => sum + m.embeddedDishCount, 0);
  console.log(`\nEmbedded dishes:`);
  console.log(`  Venues with dishes:        ${withDishes.length}`);
  console.log(`  Venues without dishes:     ${venueMap.totalMapped - withDishes.length}`);
  console.log(`  Total embedded dishes:     ${totalEmbedded}`);

  // Show delivery platforms
  const platformCounts: Record<string, number> = {};
  for (const m of venueMap.mappings) {
    for (const p of m.deliveryPlatforms) {
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    }
  }
  console.log(`\nDelivery platforms:`);
  for (const [platform, count] of Object.entries(platformCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${platform}: ${count} venues`);
  }

  // Show orphaned venues if any
  if (venueMap.orphaned.length > 0) {
    console.log(`\n⚠️  Orphaned production venues (no discovered venue link):`);
    for (const o of venueMap.orphaned.slice(0, 10)) {
      console.log(`  - ${o.name} (${o.city})`);
    }
    if (venueMap.orphaned.length > 10) {
      console.log(`  ... and ${venueMap.orphaned.length - 10} more`);
    }
  }

  console.log('\n✅ Mapping complete! Ready for Phase 3: Bulk extraction');
}

// Main execution
const options = parseArgs(process.argv.slice(2));

if (options.help) {
  showHelp();
  process.exit(0);
}

run(options)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
