#!/usr/bin/env npx tsx

/**
 * Rollback Dishes Script
 *
 * Phase 7 (Safety Net) of 100% Dish Coverage Plan:
 * Restore production dishes from a backup file.
 *
 * Usage:
 *   npx tsx src/cli/rollback-dishes.ts --backup dishes-backup.json
 *   npx tsx src/cli/rollback-dishes.ts --backup dishes-backup.json --dry-run
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
Rollback Dishes Script

Restore production dishes from a backup file.

Usage:
  npx tsx src/cli/rollback-dishes.ts --backup <filename>

Options:
  --backup, -b <file>   Backup file to restore from (required)
  --dry-run             Preview restore without writing to database
  --help, -h            Show this help

Examples:
  npx tsx src/cli/rollback-dishes.ts --backup dishes-backup-20241211.json
  npx tsx src/cli/rollback-dishes.ts --backup backup.json --dry-run
`);
}

async function run(options: CLIOptions): Promise<void> {
  console.log('\n🔄 Rollback Dishes Script');
  console.log('='.repeat(50));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  if (!options.backup) {
    console.error('❌ Error: --backup <filename> is required');
    showHelp();
    process.exit(1);
  }

  // Load backup file
  const backupPath = path.resolve(process.cwd(), options.backup);
  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Error: Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  console.log(`📂 Loading backup: ${backupPath}`);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  console.log(`   Backup timestamp: ${backup.timestamp}`);
  console.log(`   Dishes in backup: ${backup.count}\n`);

  // Confirm before proceeding
  if (!options.dryRun) {
    console.log('⚠️  WARNING: This will:');
    console.log('   1. Delete ALL current production dishes');
    console.log('   2. Restore dishes from the backup file');
    console.log('\n   This operation cannot be undone!\n');
  }

  // Step 1: Delete current dishes
  console.log('🗑️  Step 1: Deleting current production dishes...');
  const currentDishes = await db.collection('dishes').get();
  console.log(`   Found ${currentDishes.size} current dishes`);

  if (currentDishes.size > 0) {
    const BATCH_SIZE = 500;
    let deleted = 0;

    for (let i = 0; i < currentDishes.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = currentDishes.docs.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        if (!options.dryRun) {
          batch.delete(doc.ref);
        }
        deleted++;
      }

      if (!options.dryRun) {
        await batch.commit();
      }
    }
    console.log(`   ${options.dryRun ? '[DRY RUN] Would delete' : 'Deleted'} ${deleted} dishes\n`);
  }

  // Step 2: Restore from backup
  console.log('📥 Step 2: Restoring dishes from backup...');

  const BATCH_SIZE = 500;
  let restored = 0;
  let errors = 0;

  for (let i = 0; i < backup.dishes.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = backup.dishes.slice(i, i + BATCH_SIZE);

    for (const dish of chunk) {
      try {
        const { id, ...data } = dish;
        const docRef = db.collection('dishes').doc(id);

        if (!options.dryRun) {
          batch.set(docRef, data);
        }
        restored++;
      } catch (error) {
        console.log(`   ⚠️  Error preparing dish ${dish.id}: ${error}`);
        errors++;
      }
    }

    if (!options.dryRun) {
      await batch.commit();
    }

    console.log(`   Progress: ${restored}/${backup.dishes.length}`);
  }

  // Summary
  console.log('\n📊 Summary');
  console.log('='.repeat(50));
  console.log(`Current dishes deleted:   ${options.dryRun ? '(dry run)' : currentDishes.size}`);
  console.log(`Dishes restored:          ${options.dryRun ? `(would restore ${restored})` : restored}`);
  console.log(`Errors:                   ${errors}`);

  if (options.dryRun) {
    console.log('\n⚡ This was a dry run. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Rollback complete!');
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
