#!/usr/bin/env npx tsx

/**
 * Sync All Dishes Script
 *
 * Phase 4 of 100% Dish Coverage Plan:
 * Sync all extracted dishes from discovered → production.
 *
 * Logic:
 * 1. Get all discovered venues with production_venue_id
 * 2. For each: create production dishes from venue.dishes[]
 * 3. Also sync any standalone discovered_dishes
 * 4. Mark all as promoted
 *
 * Usage:
 *   npx tsx src/cli/sync-all-dishes.ts --dry-run   # Preview
 *   npx tsx src/cli/sync-all-dishes.ts              # Execute
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

import { initializeFirestore, getFirestore, discoveredVenues, dishes } from '@pad/database';

initializeFirestore();
const db = getFirestore();

interface SyncStats {
  venuesProcessed: number;
  venuesWithDishes: number;
  venuesWithoutDishes: number;
  dishesCreated: number;
  dishesSkipped: number;
  errors: number;
}

interface CLIOptions {
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    dryRun: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
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
Sync All Dishes Script

Phase 4 of 100% Dish Coverage Plan - Sync dishes to production.

Usage:
  npx tsx src/cli/sync-all-dishes.ts [options]

Options:
  --dry-run        Preview sync without writing to database
  --verbose, -v    Show detailed output
  --help, -h       Show this help

Examples:
  npx tsx src/cli/sync-all-dishes.ts --dry-run   # Preview
  npx tsx src/cli/sync-all-dishes.ts              # Execute
`);
}

/**
 * Parse price from various formats
 */
function parsePrice(priceStr: string | undefined, currency: string | undefined): { amount: number; currency: string } {
  const defaultCurrency = currency || 'CHF';

  if (!priceStr) {
    return { amount: 0, currency: defaultCurrency };
  }

  // Already a number
  if (typeof priceStr === 'number') {
    return { amount: priceStr, currency: defaultCurrency };
  }

  // Parse string: "CHF 18.90", "18.90", "€15.00"
  const match = priceStr.match(/([A-Z]{3}|[€$£])?\s*(\d+(?:[.,]\d+)?)/);
  if (match) {
    const amount = parseFloat(match[2].replace(',', '.'));
    let curr = defaultCurrency;

    if (match[1]) {
      const symbolMap: Record<string, string> = { '€': 'EUR', '$': 'USD', '£': 'GBP' };
      curr = symbolMap[match[1]] || match[1];
    }

    return { amount: isNaN(amount) ? 0 : amount, currency: curr };
  }

  return { amount: 0, currency: defaultCurrency };
}

async function run(options: CLIOptions): Promise<void> {
  console.log('\n🔄 Sync All Dishes Script');
  console.log('='.repeat(50));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  const stats: SyncStats = {
    venuesProcessed: 0,
    venuesWithDishes: 0,
    venuesWithoutDishes: 0,
    dishesCreated: 0,
    dishesSkipped: 0,
    errors: 0,
  };

  // Step 1: Get all discovered venues with production_venue_id
  console.log('📍 Step 1: Fetching promoted discovered venues...');
  const allDiscovered = await discoveredVenues.getAll();
  const promotedVenues = allDiscovered.filter((v) => v.production_venue_id);
  console.log(`   Found ${promotedVenues.length} venues with production links\n`);

  // Step 2: Process each venue
  console.log('🍽️  Step 2: Syncing dishes...\n');

  for (const dv of promotedVenues) {
    stats.venuesProcessed++;

    const venueName = dv.name;
    const productionVenueId = dv.production_venue_id!;
    const embeddedDishes = dv.dishes || [];

    if (embeddedDishes.length === 0) {
      stats.venuesWithoutDishes++;
      if (options.verbose) {
        console.log(`   ⚠️  ${venueName}: No embedded dishes`);
      }
      continue;
    }

    stats.venuesWithDishes++;

    if (options.verbose) {
      console.log(`   🏪 ${venueName}: ${embeddedDishes.length} dishes`);
    }

    // Create production dishes from embedded dishes
    for (const embeddedDish of embeddedDishes) {
      try {
        // Build the production dish
        const productionDish = {
          venue_id: productionVenueId,
          name: embeddedDish.name || 'Unknown Dish',
          description: embeddedDish.description || '',
          planted_products: [embeddedDish.planted_product || 'planted.chicken'],
          price: parsePrice(embeddedDish.price, embeddedDish.currency),
          dietary_tags: embeddedDish.dietary_tags || [],
          cuisine_type: embeddedDish.category,
          availability: { type: 'permanent' as const },
          source: {
            type: 'discovered' as const,
            discovery_id: dv.id,
          },
          last_verified: new Date(),
          status: 'active' as const,
          created_at: new Date(),
          updated_at: new Date(),
        };

        if (!options.dryRun) {
          await dishes.create(productionDish);
        }

        stats.dishesCreated++;

        if (options.verbose) {
          console.log(`      + ${embeddedDish.name} (${productionDish.price.currency} ${productionDish.price.amount})`);
        }
      } catch (error) {
        stats.errors++;
        if (options.verbose) {
          console.log(`      ❌ Error creating ${embeddedDish.name}: ${error}`);
        }
      }
    }

    // Progress indicator every 10 venues
    if (stats.venuesProcessed % 10 === 0) {
      console.log(`   Progress: ${stats.venuesProcessed}/${promotedVenues.length} venues`);
    }
  }

  // Step 3: Summary
  console.log('\n');
  console.log('📊 Sync Summary');
  console.log('='.repeat(50));
  console.log(`Venues processed:        ${stats.venuesProcessed}`);
  console.log(`  - With dishes:         ${stats.venuesWithDishes}`);
  console.log(`  - Without dishes:      ${stats.venuesWithoutDishes}`);
  console.log(`Dishes created:          ${options.dryRun ? `(would create ${stats.dishesCreated})` : stats.dishesCreated}`);
  console.log(`Errors:                  ${stats.errors}`);

  // Calculate coverage
  const coveragePercent = Math.round((stats.venuesWithDishes / stats.venuesProcessed) * 100);
  console.log(`\nDish coverage:           ${coveragePercent}%`);

  if (stats.venuesWithoutDishes > 0) {
    console.log(`\n⚠️  ${stats.venuesWithoutDishes} venues have no dishes.`);
    console.log('   Re-run bulk extraction for these venues.');
  }

  if (options.dryRun) {
    console.log('\n⚡ This was a dry run. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Sync complete! Ready for Phase 5: Progressive verification');
  }
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
