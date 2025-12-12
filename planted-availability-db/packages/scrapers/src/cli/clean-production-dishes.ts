#!/usr/bin/env npx tsx

/**
 * Clean Production Dishes Script
 *
 * Phase 1 of 100% Dish Coverage Plan:
 * 1. Export all current production dishes to backup JSON file
 * 2. Delete all production dishes
 * 3. Reset discovered_dishes status (remove production_dish_id, promoted_at)
 * 4. Reset embedded dishes in discovered_venues to fresh state
 *
 * Usage:
 *   npx tsx src/cli/clean-production-dishes.ts --backup dishes-backup.json
 *   npx tsx src/cli/clean-production-dishes.ts --backup dishes-backup.json --dry-run
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

import { initializeFirestore, getFirestore } from '@pad/database';

initializeFirestore();
const db = getFirestore();

interface CLIOptions {
  backup?: string;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--backup':
      case '-b':
        if (nextArg && !nextArg.startsWith('-')) {
          options.backup = nextArg;
          i++;
        }
        break;
      case '--dry-run':
        options.dryRun = true;
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
Clean Production Dishes Script

Phase 1 of 100% Dish Coverage Plan - Backup and clean all production dishes.

Usage:
  npx tsx src/cli/clean-production-dishes.ts --backup <filename>

Options:
  --backup, -b <file>   Output file for backup JSON (required)
  --dry-run             Preview changes without modifying database
  --help, -h            Show this help

Examples:
  npx tsx src/cli/clean-production-dishes.ts --backup dishes-backup-20241211.json
  npx tsx src/cli/clean-production-dishes.ts --backup backup.json --dry-run
`);
}

async function run(options: CLIOptions): Promise<void> {
  console.log('\n🧹 Clean Production Dishes Script');
  console.log('='.repeat(50));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  if (!options.backup) {
    console.error('❌ Error: --backup <filename> is required');
    showHelp();
    process.exit(1);
  }

  // Step 1: Export all production dishes
  console.log('📦 Step 1: Exporting production dishes...');
  const dishesSnapshot = await db.collection('dishes').get();
  console.log(`   Found ${dishesSnapshot.size} dishes in production\n`);

  const backup: {
    timestamp: string;
    count: number;
    dishes: Record<string, unknown>[];
  } = {
    timestamp: new Date().toISOString(),
    count: dishesSnapshot.size,
    dishes: [],
  };

  for (const doc of dishesSnapshot.docs) {
    backup.dishes.push({
      id: doc.id,
      ...doc.data(),
    });
  }

  // Write backup file
  const backupPath = path.resolve(process.cwd(), options.backup);
  if (!options.dryRun) {
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`   ✅ Backup saved to: ${backupPath}\n`);
  } else {
    console.log(`   [DRY RUN] Would save backup to: ${backupPath}\n`);
  }

  // Step 2: Delete all production dishes
  console.log('🗑️  Step 2: Deleting production dishes...');
  if (dishesSnapshot.size > 0) {
    const BATCH_SIZE = 500;
    let deleted = 0;

    for (let i = 0; i < dishesSnapshot.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = dishesSnapshot.docs.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        if (!options.dryRun) {
          batch.delete(doc.ref);
        }
        deleted++;
      }

      if (!options.dryRun) {
        await batch.commit();
      }
      console.log(`   Processed ${deleted}/${dishesSnapshot.size} dishes`);
    }
    console.log(`   ✅ ${options.dryRun ? '[DRY RUN] Would delete' : 'Deleted'} ${deleted} production dishes\n`);
  } else {
    console.log('   No dishes to delete\n');
  }

  // Step 3: Reset discovered_dishes status
  console.log('🔄 Step 3: Resetting discovered_dishes status...');
  const discoveredDishesSnapshot = await db.collection('discovered_dishes')
    .where('production_dish_id', '!=', null)
    .get();
  console.log(`   Found ${discoveredDishesSnapshot.size} promoted discovered dishes`);

  if (discoveredDishesSnapshot.size > 0) {
    const BATCH_SIZE = 500;
    let reset = 0;

    for (let i = 0; i < discoveredDishesSnapshot.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = discoveredDishesSnapshot.docs.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        if (!options.dryRun) {
          batch.update(doc.ref, {
            production_dish_id: null,
            promoted_at: null,
            status: 'discovered', // Reset to discovered state
          });
        }
        reset++;
      }

      if (!options.dryRun) {
        await batch.commit();
      }
    }
    console.log(`   ✅ ${options.dryRun ? '[DRY RUN] Would reset' : 'Reset'} ${reset} discovered dishes\n`);
  } else {
    console.log('   No discovered dishes to reset\n');
  }

  // Step 4: Clear embedded dishes from discovered_venues (optional - keep them for re-extraction)
  console.log('📍 Step 4: Checking embedded dishes in discovered_venues...');
  const venuesWithDishes = await db.collection('discovered_venues')
    .where('production_venue_id', '!=', null)
    .get();

  let venuesWithEmbeddedDishes = 0;
  let totalEmbeddedDishes = 0;
  for (const doc of venuesWithDishes.docs) {
    const data = doc.data();
    if (data.dishes && data.dishes.length > 0) {
      venuesWithEmbeddedDishes++;
      totalEmbeddedDishes += data.dishes.length;
    }
  }

  console.log(`   Found ${venuesWithEmbeddedDishes} venues with ${totalEmbeddedDishes} embedded dishes`);
  console.log('   (Keeping embedded dishes - they will be source for re-sync)\n');

  // Summary
  console.log('📊 Summary');
  console.log('='.repeat(50));
  console.log(`Production dishes backed up:   ${backup.count}`);
  console.log(`Production dishes deleted:     ${options.dryRun ? '(dry run)' : dishesSnapshot.size}`);
  console.log(`Discovered dishes reset:       ${options.dryRun ? '(dry run)' : discoveredDishesSnapshot.size}`);
  console.log(`Backup file:                   ${backupPath}`);

  if (options.dryRun) {
    console.log('\n⚡ This was a dry run. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Clean complete! Ready for Phase 2: Map venues');
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
