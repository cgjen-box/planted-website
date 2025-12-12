#!/usr/bin/env npx tsx

/**
 * Interactive Dish Verification Script
 *
 * Phase 5 of 100% Dish Coverage Plan:
 * Progressive manual verification where user confirms ALL dishes were found.
 *
 * Workflow:
 * 1. Stage 1 - First Venue: Show first venue with ALL extracted dishes
 *    - User opens restaurant website to cross-check
 *    - User confirms: "Are ALL dishes found? (y/n)"
 *    - If NO → restart
 *    - If YES → proceed to Stage 2
 *
 * 2. Stage 2 - Every 2nd Venue: Show venues #2, #4, #6, #8, #10
 *    - For each, user verifies ALL dishes are present
 *    - Any failure → restart
 *    - All pass → proceed to Stage 3
 *
 * 3. Stage 3 - Every 10th Venue: Show venues #10, #20, #30...
 *    - Statistical sampling for confidence
 *    - Any failure → restart
 *    - All pass → verification complete
 *
 * Usage:
 *   npx tsx src/cli/verify-dishes-interactive.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import readline from 'readline';

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

import { initializeFirestore, venues, dishes, discoveredVenues } from '@pad/database';

initializeFirestore();

interface VenueWithDishes {
  venueId: string;
  venueName: string;
  city: string;
  country: string;
  websiteUrl?: string;
  deliveryUrls: string[];
  dishes: Array<{
    name: string;
    description: string;
    price: { amount: number; currency: string };
    plantedProducts: string[];
    dietaryTags: string[];
  }>;
}

interface VerificationState {
  stage: number;
  venuesVerified: number;
  verificationsPassed: number;
  failedVenue?: string;
  restartCount: number;
}

// Create readline interface for user input
function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function run(): Promise<void> {
  console.log('\n🔍 Interactive Dish Verification');
  console.log('='.repeat(60));
  console.log(`
This tool helps verify that ALL dishes are correctly extracted.
You will be shown venues with their extracted dishes.
Please check each against the restaurant website.

Stages:
  Stage 1: Verify first venue (must pass)
  Stage 2: Verify every 2nd venue (5 venues)
  Stage 3: Verify every 10th venue (sampling)

If ANY verification fails, you can restart extraction.
`);

  const rl = createReadline();

  const state: VerificationState = {
    stage: 1,
    venuesVerified: 0,
    verificationsPassed: 0,
    restartCount: 0,
  };

  // Get all production venues with dishes
  console.log('📊 Loading production venues and dishes...\n');

  const allProductionVenues = await venues.getAll();
  const venuesWithDishes: VenueWithDishes[] = [];

  for (const pv of allProductionVenues) {
    const venueDishes = await dishes.getByVenue(pv.id, false);

    // Get discovered venue for URLs
    const discoveredList = await discoveredVenues.getAll();
    const dv = discoveredList.find((d) => d.production_venue_id === pv.id);

    const websiteUrl = dv?.delivery_platforms?.find((dp) => dp.platform === 'website')?.url;
    const deliveryUrls = dv?.delivery_platforms?.map((dp) => dp.url) || [];

    venuesWithDishes.push({
      venueId: pv.id,
      venueName: pv.name,
      city: pv.address?.city || 'Unknown',
      country: pv.address?.country || 'Unknown',
      websiteUrl,
      deliveryUrls,
      dishes: venueDishes.map((d) => ({
        name: d.name,
        description: d.description,
        price: d.price,
        plantedProducts: d.planted_products,
        dietaryTags: d.dietary_tags,
      })),
    });
  }

  // Filter to venues with dishes
  const withDishes = venuesWithDishes.filter((v) => v.dishes.length > 0);
  const withoutDishes = venuesWithDishes.filter((v) => v.dishes.length === 0);

  console.log(`Total production venues:    ${venuesWithDishes.length}`);
  console.log(`Venues WITH dishes:         ${withDishes.length}`);
  console.log(`Venues WITHOUT dishes:      ${withoutDishes.length}`);

  if (withoutDishes.length > 0) {
    console.log('\n⚠️  Warning: Some venues have no dishes:');
    for (const v of withoutDishes.slice(0, 5)) {
      console.log(`   - ${v.venueName} (${v.city})`);
    }
    if (withoutDishes.length > 5) {
      console.log(`   ... and ${withoutDishes.length - 5} more`);
    }
  }

  console.log('\n' + '='.repeat(60));

  // Stage 1: First venue
  console.log('\n📌 STAGE 1: Verify First Venue\n');

  if (withDishes.length === 0) {
    console.log('❌ No venues with dishes found. Please run extraction first.');
    rl.close();
    return;
  }

  const firstVenue = withDishes[0];
  const stage1Pass = await verifyVenue(rl, firstVenue, 1);

  if (!stage1Pass) {
    console.log('\n❌ Stage 1 failed. Please fix extraction and re-run.');
    console.log('   Run: npx tsx src/cli/bulk-extract-dishes.ts --input venue-map.json');
    rl.close();
    return;
  }

  state.venuesVerified++;
  state.verificationsPassed++;
  console.log('\n✅ Stage 1 passed!\n');

  // Stage 2: Every 2nd venue (5 venues)
  console.log('='.repeat(60));
  console.log('\n📌 STAGE 2: Verify Every 2nd Venue (5 venues)\n');

  const stage2Indices = [1, 3, 5, 7, 9].filter((i) => i < withDishes.length);

  for (const idx of stage2Indices) {
    const venue = withDishes[idx];
    const pass = await verifyVenue(rl, venue, idx + 1);

    state.venuesVerified++;

    if (!pass) {
      state.failedVenue = venue.venueName;
      console.log('\n❌ Stage 2 failed. Please fix extraction and re-run.');
      console.log(`   Failed venue: ${venue.venueName}`);
      rl.close();
      return;
    }

    state.verificationsPassed++;
  }

  console.log('\n✅ Stage 2 passed!\n');

  // Stage 3: Every 10th venue
  console.log('='.repeat(60));
  console.log('\n📌 STAGE 3: Verify Every 10th Venue (sampling)\n');

  const stage3Indices: number[] = [];
  for (let i = 9; i < withDishes.length; i += 10) {
    stage3Indices.push(i);
  }

  if (stage3Indices.length === 0) {
    console.log('   (Skipped - not enough venues for sampling)');
  } else {
    for (const idx of stage3Indices) {
      const venue = withDishes[idx];
      const pass = await verifyVenue(rl, venue, idx + 1);

      state.venuesVerified++;

      if (!pass) {
        state.failedVenue = venue.venueName;
        console.log('\n❌ Stage 3 failed. Please fix extraction and re-run.');
        console.log(`   Failed venue: ${venue.venueName}`);
        rl.close();
        return;
      }

      state.verificationsPassed++;
    }
  }

  console.log('\n✅ Stage 3 passed!\n');

  // Final summary
  console.log('='.repeat(60));
  console.log('\n🎉 VERIFICATION COMPLETE!\n');
  console.log('All progressive verification stages passed.');
  console.log(`\nStatistics:`);
  console.log(`   Total venues verified:   ${state.venuesVerified}`);
  console.log(`   All passed:              ${state.verificationsPassed}`);
  console.log(`   Total venues:            ${withDishes.length}`);
  console.log(`   Coverage confidence:     HIGH`);

  console.log('\n✅ Dish extraction verified! Ready for production use.');

  rl.close();
}

async function verifyVenue(
  rl: readline.Interface,
  venue: VenueWithDishes,
  venueNumber: number
): Promise<boolean> {
  console.log('━'.repeat(60));
  console.log(`\n🏪 Venue #${venueNumber}: ${venue.venueName}`);
  console.log(`📍 Location: ${venue.city}, ${venue.country}`);

  if (venue.websiteUrl) {
    console.log(`🌐 Website: ${venue.websiteUrl}`);
  }

  if (venue.deliveryUrls.length > 0) {
    console.log(`🚗 Delivery URLs:`);
    for (const url of venue.deliveryUrls.slice(0, 3)) {
      console.log(`   ${url}`);
    }
  }

  console.log('━'.repeat(60));
  console.log(`\nFound ${venue.dishes.length} dishes:\n`);

  for (let i = 0; i < venue.dishes.length; i++) {
    const dish = venue.dishes[i];
    console.log(`${i + 1}. ${dish.name}`);
    console.log(`   Price: ${dish.price.currency} ${dish.price.amount.toFixed(2)}`);
    console.log(`   Products: ${dish.plantedProducts.join(', ')}`);

    if (dish.description) {
      const desc = dish.description.length > 80
        ? dish.description.slice(0, 80) + '...'
        : dish.description;
      console.log(`   Desc: ${desc}`);
    }

    if (dish.dietaryTags.length > 0) {
      console.log(`   Tags: ${dish.dietaryTags.join(', ')}`);
    }

    console.log('');
  }

  console.log('━'.repeat(60));
  console.log('\nPlease verify against the restaurant website/menu.');
  console.log('Check that ALL planted dishes are captured correctly.\n');

  const answer = await askQuestion(rl, 'Are ALL dishes found correctly? (y/n): ');

  if (answer === 'y' || answer === 'yes') {
    return true;
  } else if (answer === 'n' || answer === 'no') {
    const reason = await askQuestion(rl, 'What is wrong? (brief description): ');
    console.log(`\n📝 Noted: ${reason}`);
    return false;
  } else {
    console.log('Invalid input. Please enter y or n.');
    return verifyVenue(rl, venue, venueNumber);
  }
}

// Main execution
run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
