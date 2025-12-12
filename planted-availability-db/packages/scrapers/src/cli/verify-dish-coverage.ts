#!/usr/bin/env npx tsx

/**
 * Dish Coverage Report Script
 *
 * Phase 6 of 100% Dish Coverage Plan:
 * Generate statistics on dish coverage across production venues.
 *
 * Usage:
 *   npx tsx src/cli/verify-dish-coverage.ts
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

import { initializeFirestore, venues, dishes } from '@pad/database';

initializeFirestore();

interface CLIOptions {
  json: boolean;
  output?: string;
  help: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    json: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--json':
        options.json = true;
        break;
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
Dish Coverage Report Script

Generate statistics on dish coverage across production venues.

Usage:
  npx tsx src/cli/verify-dish-coverage.ts [options]

Options:
  --json           Output as JSON
  --output, -o     Write report to file
  --help, -h       Show this help

Examples:
  npx tsx src/cli/verify-dish-coverage.ts
  npx tsx src/cli/verify-dish-coverage.ts --json --output report.json
`);
}

async function run(options: CLIOptions): Promise<void> {
  // Get all production venues
  const allVenues = await venues.getAll();

  // Get dish counts per venue
  const venueStats: Array<{
    id: string;
    name: string;
    city: string;
    dishCount: number;
  }> = [];

  let totalDishes = 0;
  let venuesWithDishes = 0;
  let venuesWithoutDishes = 0;
  const dishCounts: number[] = [];
  const dishesByProduct: Record<string, number> = {};
  const dishesByStatus: Record<string, number> = {};

  for (const venue of allVenues) {
    const venueDishes = await dishes.getByVenue(venue.id, false);
    const count = venueDishes.length;

    venueStats.push({
      id: venue.id,
      name: venue.name,
      city: venue.address?.city || 'Unknown',
      dishCount: count,
    });

    totalDishes += count;
    dishCounts.push(count);

    if (count > 0) {
      venuesWithDishes++;
    } else {
      venuesWithoutDishes++;
    }

    // Aggregate dish stats
    for (const dish of venueDishes) {
      // By product
      for (const product of dish.planted_products) {
        dishesByProduct[product] = (dishesByProduct[product] || 0) + 1;
      }

      // By status
      dishesByStatus[dish.status] = (dishesByStatus[dish.status] || 0) + 1;
    }
  }

  // Calculate statistics
  const avgDishes = totalDishes / allVenues.length || 0;
  const minDishes = Math.min(...dishCounts);
  const maxDishes = Math.max(...dishCounts);
  const coveragePercent = (venuesWithDishes / allVenues.length) * 100 || 0;

  // Sort by dish count
  venueStats.sort((a, b) => b.dishCount - a.dishCount);

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalVenues: allVenues.length,
      venuesWithDishes,
      venuesWithoutDishes,
      coveragePercent: Math.round(coveragePercent * 10) / 10,
      totalDishes,
      avgDishesPerVenue: Math.round(avgDishes * 10) / 10,
      minDishes,
      maxDishes,
    },
    byProduct: dishesByProduct,
    byStatus: dishesByStatus,
    venuesWithoutDishes: venueStats.filter((v) => v.dishCount === 0),
    topVenues: venueStats.slice(0, 10),
  };

  if (options.json) {
    const output = JSON.stringify(report, null, 2);
    if (options.output) {
      fs.writeFileSync(options.output, output);
      console.log(`Report written to: ${options.output}`);
    } else {
      console.log(output);
    }
    return;
  }

  // Pretty print report
  console.log('\n📊 Dish Coverage Report');
  console.log('='.repeat(50));
  console.log(`Generated: ${new Date().toLocaleString()}\n`);

  console.log('📈 Summary');
  console.log('-'.repeat(50));
  console.log(`Total production venues:    ${report.summary.totalVenues}`);
  console.log(`Venues WITH dishes:         ${report.summary.venuesWithDishes} (${report.summary.coveragePercent}%)`);
  console.log(`Venues WITHOUT dishes:      ${report.summary.venuesWithoutDishes}`);
  console.log('');
  console.log(`Total dishes:               ${report.summary.totalDishes}`);
  console.log(`Average dishes per venue:   ${report.summary.avgDishesPerVenue}`);
  console.log(`Min dishes:                 ${report.summary.minDishes}`);
  console.log(`Max dishes:                 ${report.summary.maxDishes}`);

  // Coverage indicator
  console.log('');
  if (report.summary.coveragePercent === 100) {
    console.log('🎉 100% COVERAGE ACHIEVED!');
  } else if (report.summary.coveragePercent >= 90) {
    console.log(`✅ Good coverage (${report.summary.coveragePercent}%)`);
  } else if (report.summary.coveragePercent >= 70) {
    console.log(`⚠️  Moderate coverage (${report.summary.coveragePercent}%)`);
  } else {
    console.log(`❌ Low coverage (${report.summary.coveragePercent}%)`);
  }

  // By product
  console.log('\n🥩 Dishes by Planted Product');
  console.log('-'.repeat(50));
  for (const [product, count] of Object.entries(report.byProduct).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${product}: ${count}`);
  }

  // By status
  console.log('\n📋 Dishes by Status');
  console.log('-'.repeat(50));
  for (const [status, count] of Object.entries(report.byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status}: ${count}`);
  }

  // Top venues
  console.log('\n🏆 Top 10 Venues by Dish Count');
  console.log('-'.repeat(50));
  for (const venue of report.topVenues) {
    console.log(`  ${venue.dishCount.toString().padStart(3)} dishes - ${venue.name} (${venue.city})`);
  }

  // Venues without dishes
  if (report.venuesWithoutDishes.length > 0) {
    console.log(`\n⚠️  Venues Without Dishes (${report.venuesWithoutDishes.length})`);
    console.log('-'.repeat(50));
    for (const venue of report.venuesWithoutDishes.slice(0, 15)) {
      console.log(`  - ${venue.name} (${venue.city})`);
    }
    if (report.venuesWithoutDishes.length > 15) {
      console.log(`  ... and ${report.venuesWithoutDishes.length - 15} more`);
    }
  }

  // Save to file if requested
  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
    console.log(`\n📁 Report saved to: ${options.output}`);
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
