#!/usr/bin/env npx tsx

/**
 * Bulk Dish Extraction Script
 *
 * Phase 3 of 100% Dish Coverage Plan:
 * Run SmartDishFinderAgent on ALL discovered venues to extract fresh dish data.
 *
 * Features:
 * - Resumable via checkpoint file
 * - Rate limiting between batches
 * - Configurable concurrency
 * - Progress logging
 * - Error tracking
 *
 * Usage:
 *   npx tsx src/cli/bulk-extract-dishes.ts --input venue-map.json
 *   npx tsx src/cli/bulk-extract-dishes.ts --input venue-map.json --resume
 *   npx tsx src/cli/bulk-extract-dishes.ts --input venue-map.json --batch-size 10 --delay 5000
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

import { initializeFirestore } from '@pad/database';
import { SmartDishFinderAgent } from '../agents/smart-dish-finder/index.js';

initializeFirestore();

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

interface Checkpoint {
  timestamp: string;
  inputFile: string;
  processed: string[];
  successful: string[];
  failed: string[];
  totalDishesExtracted: number;
  lastProcessedIndex: number;
  errors: Array<{ venueId: string; venueName: string; error: string }>;
}

interface CLIOptions {
  input?: string;
  resume: boolean;
  batchSize: number;
  delay: number;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    resume: false,
    batchSize: 5,
    delay: 3000,
    dryRun: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--input':
      case '-i':
        if (nextArg && !nextArg.startsWith('-')) {
          options.input = nextArg;
          i++;
        }
        break;
      case '--resume':
      case '-r':
        options.resume = true;
        break;
      case '--batch-size':
      case '-b':
        if (nextArg) {
          options.batchSize = parseInt(nextArg, 10) || 5;
          i++;
        }
        break;
      case '--delay':
      case '-d':
        if (nextArg) {
          options.delay = parseInt(nextArg, 10) || 3000;
          i++;
        }
        break;
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
Bulk Dish Extraction Script

Phase 3 of 100% Dish Coverage Plan - Extract dishes from all discovered venues.

Usage:
  npx tsx src/cli/bulk-extract-dishes.ts --input <venue-map.json>

Options:
  --input, -i <file>     Input venue map file (from map-venues.ts)
  --resume, -r           Resume from checkpoint file
  --batch-size, -b <n>   Venues per batch (default: 5)
  --delay, -d <ms>       Delay between batches in ms (default: 3000)
  --dry-run              Don't save dishes to database
  --verbose, -v          Verbose output
  --help, -h             Show this help

Examples:
  npx tsx src/cli/bulk-extract-dishes.ts --input venue-map.json
  npx tsx src/cli/bulk-extract-dishes.ts --input venue-map.json --resume
  npx tsx src/cli/bulk-extract-dishes.ts --input venue-map.json --batch-size 10 -v
`);
}

function getCheckpointPath(inputFile: string): string {
  const baseName = path.basename(inputFile, '.json');
  return path.resolve(process.cwd(), `${baseName}-checkpoint.json`);
}

function loadCheckpoint(checkpointPath: string): Checkpoint | null {
  if (fs.existsSync(checkpointPath)) {
    return JSON.parse(fs.readFileSync(checkpointPath, 'utf-8'));
  }
  return null;
}

function saveCheckpoint(checkpointPath: string, checkpoint: Checkpoint): void {
  fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

async function run(options: CLIOptions): Promise<void> {
  console.log('\n🍽️  Bulk Dish Extraction Script');
  console.log('='.repeat(50));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log(`Delay: ${options.delay}ms\n`);

  if (!options.input) {
    console.error('❌ Error: --input <filename> is required');
    showHelp();
    process.exit(1);
  }

  // Load venue map
  const inputPath = path.resolve(process.cwd(), options.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const venueMap: VenueMap = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`📂 Loaded venue map: ${venueMap.mappings.length} venues\n`);

  // Checkpoint handling
  const checkpointPath = getCheckpointPath(options.input);
  let checkpoint: Checkpoint;

  if (options.resume) {
    const existing = loadCheckpoint(checkpointPath);
    if (existing) {
      checkpoint = existing;
      console.log(`📌 Resuming from checkpoint: ${checkpoint.processed.length}/${venueMap.mappings.length} processed\n`);
    } else {
      console.log('⚠️  No checkpoint found, starting fresh\n');
      checkpoint = {
        timestamp: new Date().toISOString(),
        inputFile: options.input,
        processed: [],
        successful: [],
        failed: [],
        totalDishesExtracted: 0,
        lastProcessedIndex: -1,
        errors: [],
      };
    }
  } else {
    checkpoint = {
      timestamp: new Date().toISOString(),
      inputFile: options.input,
      processed: [],
      successful: [],
      failed: [],
      totalDishesExtracted: 0,
      lastProcessedIndex: -1,
      errors: [],
    };
  }

  // Initialize agent
  console.log('🤖 Initializing SmartDishFinderAgent...');
  const agent = new SmartDishFinderAgent({
    maxVenuesPerRun: options.batchSize,
    dryRun: options.dryRun,
    verbose: options.verbose,
  });
  await agent.initialize();
  console.log('   Agent ready!\n');

  // Filter venues to process
  const venuesToProcess = venueMap.mappings.filter(
    (m) => !checkpoint.processed.includes(m.discoveredVenueId)
  );

  console.log(`📋 Venues to process: ${venuesToProcess.length}\n`);
  console.log('='.repeat(50));

  // Process in batches
  let batchNum = 0;
  for (let i = 0; i < venuesToProcess.length; i += options.batchSize) {
    batchNum++;
    const batch = venuesToProcess.slice(i, i + options.batchSize);

    console.log(`\n📦 Batch ${batchNum}: Processing ${batch.length} venues...`);

    for (const mapping of batch) {
      const startTime = Date.now();

      try {
        console.log(`   🏪 ${mapping.discoveredVenueName} (${mapping.city})`);

        // Run extraction for this specific venue
        const run = await agent.runExtraction({
          mode: 'enrich',
          target_venues: [mapping.discoveredVenueId],
          max_venues: 1,
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const dishCount = run.stats.dishes_extracted + run.stats.dishes_updated;

        console.log(`      ✅ ${dishCount} dishes extracted (${duration}s)`);

        checkpoint.processed.push(mapping.discoveredVenueId);
        checkpoint.successful.push(mapping.discoveredVenueId);
        checkpoint.totalDishesExtracted += dishCount;
        checkpoint.lastProcessedIndex = venueMap.mappings.indexOf(mapping);
      } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const errorMsg = error instanceof Error ? error.message : String(error);

        console.log(`      ❌ Error: ${errorMsg.slice(0, 80)} (${duration}s)`);

        checkpoint.processed.push(mapping.discoveredVenueId);
        checkpoint.failed.push(mapping.discoveredVenueId);
        checkpoint.errors.push({
          venueId: mapping.discoveredVenueId,
          venueName: mapping.discoveredVenueName,
          error: errorMsg,
        });
        checkpoint.lastProcessedIndex = venueMap.mappings.indexOf(mapping);
      }

      // Save checkpoint after each venue
      saveCheckpoint(checkpointPath, checkpoint);
    }

    // Progress update
    const progress = Math.round((checkpoint.processed.length / venueMap.mappings.length) * 100);
    console.log(`\n   📊 Progress: ${checkpoint.processed.length}/${venueMap.mappings.length} (${progress}%)`);
    console.log(`   Dishes: ${checkpoint.totalDishesExtracted} | Success: ${checkpoint.successful.length} | Failed: ${checkpoint.failed.length}`);

    // Delay between batches
    if (i + options.batchSize < venuesToProcess.length) {
      console.log(`   ⏳ Waiting ${options.delay}ms before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }
  }

  // Cleanup
  await agent.cleanup();

  // Final summary
  console.log('\n');
  console.log('📊 Final Summary');
  console.log('='.repeat(50));
  console.log(`Total venues processed:   ${checkpoint.processed.length}`);
  console.log(`Successful:               ${checkpoint.successful.length}`);
  console.log(`Failed:                   ${checkpoint.failed.length}`);
  console.log(`Total dishes extracted:   ${checkpoint.totalDishesExtracted}`);
  console.log(`Avg dishes per venue:     ${(checkpoint.totalDishesExtracted / checkpoint.successful.length || 0).toFixed(1)}`);

  if (checkpoint.failed.length > 0) {
    console.log('\n⚠️  Failed venues:');
    for (const err of checkpoint.errors.slice(0, 10)) {
      console.log(`   - ${err.venueName}: ${err.error.slice(0, 60)}`);
    }
    if (checkpoint.errors.length > 10) {
      console.log(`   ... and ${checkpoint.errors.length - 10} more`);
    }
  }

  // Cleanup checkpoint on complete success
  if (checkpoint.processed.length === venueMap.mappings.length && checkpoint.failed.length === 0) {
    console.log('\n✅ All venues processed successfully!');
    console.log('   Checkpoint file can be deleted.');
  } else if (checkpoint.failed.length > 0) {
    console.log(`\n⚠️  Completed with ${checkpoint.failed.length} failures.`);
    console.log('   Use --resume to retry failed venues after fixing issues.');
  }

  console.log('\n✅ Extraction complete! Ready for Phase 4: Sync to production');
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
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
