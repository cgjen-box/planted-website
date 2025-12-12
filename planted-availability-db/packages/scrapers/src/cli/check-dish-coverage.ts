#!/usr/bin/env tsx
/**
 * Check Dish Coverage CLI
 *
 * Identifies venues that are missing dishes (empty dishes array).
 * Can optionally flag venues for dish extraction.
 *
 * Usage:
 *   pnpm run check-dishes [options]
 *
 * Options:
 *   --countries, -c <list>   Filter by country codes (CH,DE,AT)
 *   --status <status>        Filter by venue status (verified, promoted)
 *   --chains <list>          Filter by chain IDs
 *   --output, -o <file>      Export to JSON file
 *   --flag                   Auto-flag venues for dish_extraction
 *   --priority <level>       Flag priority: urgent, high, normal (default: normal)
 *   --max-flag <n>           Max venues to flag (safety limit, default: 100)
 *   --dry-run                Show what would be flagged without changes
 *   --summary                Show summary statistics only
 *   --help, -h               Show help
 *
 * Examples:
 *   pnpm run check-dishes --summary
 *   pnpm run check-dishes --countries CH,DE,AT --summary
 *   pnpm run check-dishes --countries CH --flag --priority high --dry-run
 *   pnpm run check-dishes --chains dean-david --output missing-dishes.json
 */

// Load environment variables from .env file (look in parent directories too)
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../..'); // planted-availability-db/

// Try loading from multiple locations
dotenv.config({ path: path.resolve(rootDir, '.env') }); // planted-availability-db/.env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // packages/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // scrapers/.env

// Fix relative GOOGLE_APPLICATION_CREDENTIALS path - resolve relative to the .env location (rootDir)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path.isAbsolute(credPath)) {
    const resolvedPath = path.resolve(rootDir, credPath);
    if (existsSync(resolvedPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = resolvedPath;
    }
  }
}

import { discoveredVenues } from '@pad/database';
import type { SupportedCountry, DiscoveredVenueStatus, VenueFlagPriority } from '@pad/core';
import { SUPPORTED_COUNTRIES } from '@pad/core';

interface CLIOptions {
  countries?: SupportedCountry[];
  status?: DiscoveredVenueStatus[];
  chains?: string[];
  output?: string;
  flag: boolean;
  priority: VenueFlagPriority;
  maxFlag: number;
  dryRun: boolean;
  summary: boolean;
  help: boolean;
}

interface VenueMissingDishes {
  id: string;
  name: string;
  country: SupportedCountry;
  city: string;
  chain_id?: string;
  chain_name?: string;
  status: DiscoveredVenueStatus;
  platforms: string[];
}

interface CoverageReport {
  total_venues: number;
  venues_with_dishes: number;
  venues_without_dishes: number;
  percentage_missing: number;
  by_country: Record<string, { total: number; missing: number; percentage: number }>;
  by_status: Record<string, { total: number; missing: number }>;
  by_chain: Record<string, { total: number; missing: number }>;
  missing_venues: VenueMissingDishes[];
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    flag: false,
    priority: 'normal',
    maxFlag: 100,
    dryRun: false,
    summary: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--countries':
      case '-c':
        if (nextArg) {
          options.countries = nextArg
            .split(',')
            .map((c) => c.trim().toUpperCase())
            .filter((c) => SUPPORTED_COUNTRIES.includes(c as SupportedCountry)) as SupportedCountry[];
          i++;
        }
        break;

      case '--status':
        if (nextArg) {
          const validStatuses: DiscoveredVenueStatus[] = ['discovered', 'verified', 'rejected', 'promoted', 'stale'];
          options.status = nextArg
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter((s) => validStatuses.includes(s as DiscoveredVenueStatus)) as DiscoveredVenueStatus[];
          i++;
        }
        break;

      case '--chains':
        if (nextArg) {
          options.chains = nextArg.split(',').map((c) => c.trim());
          i++;
        }
        break;

      case '--output':
      case '-o':
        if (nextArg) {
          options.output = nextArg;
          i++;
        }
        break;

      case '--flag':
        options.flag = true;
        break;

      case '--priority':
        if (nextArg && ['urgent', 'high', 'normal'].includes(nextArg.toLowerCase())) {
          options.priority = nextArg.toLowerCase() as VenueFlagPriority;
          i++;
        }
        break;

      case '--max-flag':
        if (nextArg) {
          options.maxFlag = parseInt(nextArg, 10) || 100;
          i++;
        }
        break;

      case '--dry-run':
        options.dryRun = true;
        break;

      case '--summary':
        options.summary = true;
        break;

      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  // Default to verified and promoted if no status specified
  if (!options.status) {
    options.status = ['verified', 'promoted'];
  }

  return options;
}

function showHelp(): void {
  console.log(`
Check Dish Coverage CLI

Identifies venues that are missing dishes and can flag them for extraction.

Usage:
  pnpm run check-dishes [options]

Options:
  --countries, -c <list>   Filter by country codes (CH,DE,AT,NL,UK,FR,ES,IT,BE,PL)
  --status <status>        Filter by venue status (default: verified,promoted)
  --chains <list>          Filter by chain IDs (e.g., dean-david,kaimug)
  --output, -o <file>      Export full report to JSON file
  --flag                   Flag venues for dish_extraction
  --priority <level>       Flag priority: urgent, high, normal (default: normal)
  --max-flag <n>           Max venues to flag (default: 100)
  --dry-run                Show what would be flagged without making changes
  --summary                Show summary statistics only (no venue list)
  --help, -h               Show this help

Examples:
  # Show summary for all verified/promoted venues
  pnpm run check-dishes --summary

  # Show summary for DACH region
  pnpm run check-dishes --countries CH,DE,AT --summary

  # Flag Swiss venues missing dishes (dry run)
  pnpm run check-dishes --countries CH --flag --priority high --dry-run

  # Flag and export report
  pnpm run check-dishes --countries CH --flag --max-flag 10 --output missing-ch.json

  # Check specific chain
  pnpm run check-dishes --chains dean-david --summary
`);
}

async function generateReport(options: CLIOptions): Promise<CoverageReport> {
  console.log('Fetching venues from database...\n');

  // Get all venues
  const allVenues = await discoveredVenues.getAll();

  // Filter by status
  let filteredVenues = allVenues.filter((v) => options.status!.includes(v.status));

  // Filter by countries
  if (options.countries && options.countries.length > 0) {
    filteredVenues = filteredVenues.filter((v) => options.countries!.includes(v.address.country as SupportedCountry));
  }

  // Filter by chains
  if (options.chains && options.chains.length > 0) {
    filteredVenues = filteredVenues.filter((v) => v.chain_id && options.chains!.includes(v.chain_id));
  }

  // Categorize venues
  const venuesWithDishes = filteredVenues.filter((v) => v.dishes && v.dishes.length > 0);
  const venuesWithoutDishes = filteredVenues.filter((v) => !v.dishes || v.dishes.length === 0);

  // Build report
  const byCountry: Record<string, { total: number; missing: number; percentage: number }> = {};
  const byStatus: Record<string, { total: number; missing: number }> = {};
  const byChain: Record<string, { total: number; missing: number }> = {};

  // Group by country
  for (const venue of filteredVenues) {
    const country = venue.address.country;
    if (!byCountry[country]) {
      byCountry[country] = { total: 0, missing: 0, percentage: 0 };
    }
    byCountry[country].total++;
    if (!venue.dishes || venue.dishes.length === 0) {
      byCountry[country].missing++;
    }
  }

  // Calculate percentages
  for (const country of Object.keys(byCountry)) {
    byCountry[country].percentage = Math.round((byCountry[country].missing / byCountry[country].total) * 100);
  }

  // Group by status
  for (const venue of filteredVenues) {
    if (!byStatus[venue.status]) {
      byStatus[venue.status] = { total: 0, missing: 0 };
    }
    byStatus[venue.status].total++;
    if (!venue.dishes || venue.dishes.length === 0) {
      byStatus[venue.status].missing++;
    }
  }

  // Group by chain
  for (const venue of filteredVenues) {
    if (venue.chain_id) {
      const chainKey = venue.chain_name || venue.chain_id;
      if (!byChain[chainKey]) {
        byChain[chainKey] = { total: 0, missing: 0 };
      }
      byChain[chainKey].total++;
      if (!venue.dishes || venue.dishes.length === 0) {
        byChain[chainKey].missing++;
      }
    }
  }

  // Build missing venues list
  const missingVenues: VenueMissingDishes[] = venuesWithoutDishes.map((v) => ({
    id: v.id,
    name: v.name,
    country: v.address.country as SupportedCountry,
    city: v.address.city,
    chain_id: v.chain_id,
    chain_name: v.chain_name,
    status: v.status,
    platforms: v.delivery_platforms.map((p) => p.platform),
  }));

  return {
    total_venues: filteredVenues.length,
    venues_with_dishes: venuesWithDishes.length,
    venues_without_dishes: venuesWithoutDishes.length,
    percentage_missing: filteredVenues.length > 0 ? Math.round((venuesWithoutDishes.length / filteredVenues.length) * 100) : 0,
    by_country: byCountry,
    by_status: byStatus,
    by_chain: byChain,
    missing_venues: missingVenues,
  };
}

function printReport(report: CoverageReport, options: CLIOptions): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    DISH COVERAGE REPORT                        ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('SUMMARY');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Total venues checked:    ${report.total_venues}`);
  console.log(`  Venues with dishes:      ${report.venues_with_dishes}`);
  console.log(`  Venues WITHOUT dishes:   ${report.venues_without_dishes} (${report.percentage_missing}%)`);
  console.log('');

  // By country
  console.log('BY COUNTRY');
  console.log('───────────────────────────────────────────────────────────────');
  const sortedCountries = Object.entries(report.by_country).sort((a, b) => b[1].missing - a[1].missing);
  for (const [country, stats] of sortedCountries) {
    const bar = '█'.repeat(Math.min(Math.round(stats.percentage / 5), 20));
    console.log(`  ${country}: ${stats.missing} missing / ${stats.total} total (${stats.percentage}%) ${bar}`);
  }
  console.log('');

  // By status
  console.log('BY STATUS');
  console.log('───────────────────────────────────────────────────────────────');
  for (const [status, stats] of Object.entries(report.by_status)) {
    console.log(`  ${status}: ${stats.missing} missing / ${stats.total} total`);
  }
  console.log('');

  // By chain (top 10)
  if (Object.keys(report.by_chain).length > 0) {
    console.log('TOP CHAINS MISSING DISHES');
    console.log('───────────────────────────────────────────────────────────────');
    const sortedChains = Object.entries(report.by_chain)
      .filter(([, stats]) => stats.missing > 0)
      .sort((a, b) => b[1].missing - a[1].missing)
      .slice(0, 10);

    for (const [chain, stats] of sortedChains) {
      console.log(`  ${chain}: ${stats.missing} missing / ${stats.total} total`);
    }
    console.log('');
  }

  // Individual venues (if not summary mode)
  if (!options.summary && report.missing_venues.length > 0) {
    console.log('VENUES WITHOUT DISHES');
    console.log('───────────────────────────────────────────────────────────────');
    const displayVenues = report.missing_venues.slice(0, 50);
    for (const venue of displayVenues) {
      const chainInfo = venue.chain_name ? ` [${venue.chain_name}]` : '';
      console.log(`  ${venue.country} | ${venue.city} | ${venue.name}${chainInfo}`);
      console.log(`       ID: ${venue.id} | Platforms: ${venue.platforms.join(', ')}`);
    }
    if (report.missing_venues.length > 50) {
      console.log(`  ... and ${report.missing_venues.length - 50} more venues`);
    }
    console.log('');
  }
}

async function flagVenues(report: CoverageReport, options: CLIOptions): Promise<void> {
  const toFlag = report.missing_venues.slice(0, options.maxFlag);

  console.log('FLAG VENUES FOR DISH EXTRACTION');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`  Venues to flag: ${toFlag.length}`);
  console.log(`  Priority: ${options.priority}`);
  console.log(`  Dry run: ${options.dryRun}`);
  console.log('');

  if (options.dryRun) {
    console.log('DRY RUN - No changes will be made\n');
    console.log('Would flag the following venues:');
    for (const venue of toFlag) {
      console.log(`  - ${venue.name} (${venue.country}, ${venue.city}) [${venue.id}]`);
    }
    console.log('');
    return;
  }

  // Actually flag venues
  console.log('Flagging venues...\n');
  let flagged = 0;
  let errors = 0;

  for (const venue of toFlag) {
    try {
      await discoveredVenues.flagVenue(
        venue.id,
        'dish_extraction',
        options.priority,
        'system',
        'Flagged by check-dish-coverage CLI - venue has no dishes'
      );
      flagged++;
      console.log(`  ✓ Flagged: ${venue.name} (${venue.id})`);
    } catch (error) {
      errors++;
      console.log(`  ✗ Failed to flag: ${venue.name} (${venue.id}) - ${error}`);
    }
  }

  console.log('');
  console.log(`Flagging complete: ${flagged} flagged, ${errors} errors`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('🍽️  Check Dish Coverage\n');

  // Log configuration
  console.log('Configuration:');
  if (options.countries) console.log(`  Countries: ${options.countries.join(', ')}`);
  if (options.status) console.log(`  Status: ${options.status.join(', ')}`);
  if (options.chains) console.log(`  Chains: ${options.chains.join(', ')}`);
  if (options.flag) console.log(`  Flag mode: enabled (priority: ${options.priority}, max: ${options.maxFlag})`);
  if (options.dryRun) console.log(`  Dry run: enabled`);
  console.log('');

  try {
    // Generate report
    const report = await generateReport(options);

    // Print report
    printReport(report, options);

    // Flag venues if requested
    if (options.flag) {
      await flagVenues(report, options);
    }

    // Export to file if requested
    if (options.output) {
      writeFileSync(options.output, JSON.stringify(report, null, 2));
      console.log(`Report exported to: ${options.output}`);
    }

    console.log('Done! 🎉');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
