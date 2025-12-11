#!/usr/bin/env tsx
/**
 * Add a venue manually from a delivery platform URL
 *
 * Usage:
 *   pnpm tsx src/cli/add-venue.ts <url>
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../../..');

dotenv.config({ path: path.resolve(rootDir, '.env') });

// Fix credentials path
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path.isAbsolute(credPath)) {
    const resolvedPath = path.resolve(rootDir, credPath);
    if (fs.existsSync(resolvedPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = resolvedPath;
    }
  }
}

import { initializeFirestore, discoveredVenues } from '@pad/database';
import { DishFinderAIClient } from '../agents/smart-dish-finder/DishFinderAIClient.js';
import { PuppeteerFetcher } from '../agents/smart-dish-finder/PuppeteerFetcher.js';
import type { DeliveryPlatform, SupportedCountry } from '@pad/core';
import { getCountryFromUrl } from '../agents/smart-discovery/country_url_util.js';

// Detect platform from URL
function detectPlatform(url: string): DeliveryPlatform {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('uber-eats') || lowerUrl.includes('ubereats')) return 'uber-eats';
  if (lowerUrl.includes('just-eat')) return 'just-eat';
  if (lowerUrl.includes('wolt.com')) return 'wolt';
  if (lowerUrl.includes('smood.ch')) return 'smood';
  if (lowerUrl.includes('lieferando')) return 'lieferando';
  if (lowerUrl.includes('deliveroo')) return 'deliveroo';
  if (lowerUrl.includes('glovo')) return 'glovo';
  return 'uber-eats'; // Default
}

// Extract venue ID from URL
function extractVenueId(url: string): string {
  // Just Eat: https://www.just-eat.ch/en/menu/restaurant-slug
  const justEatMatch = url.match(/just-eat\.ch\/(?:en\/)?(?:menu|speisekarte)\/([^/?#]+)/);
  if (justEatMatch) return justEatMatch[1];

  // Uber Eats
  const uberMatch = url.match(/ubereats\.com\/[^/]+\/food-delivery\/[^/]+\/([^/?#]+)/);
  if (uberMatch) return uberMatch[1];

  // Fallback: use last path segment
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'unknown';
}

async function main() {
  const url = process.argv[2];
  const venueName = process.argv[3]; // Optional venue name override

  if (!url) {
    console.error('Usage: pnpm tsx src/cli/add-venue.ts <delivery-platform-url> [venue-name]');
    process.exit(1);
  }

  console.log(`\n🏪 Adding venue from URL: ${url}\n`);

  // Initialize Firestore
  initializeFirestore();

  // Detect platform and country
  const platform = detectPlatform(url);
  const country = getCountryFromUrl(url) || 'CH';
  const venueId = extractVenueId(url);

  console.log(`   Platform: ${platform}`);
  console.log(`   Country: ${country}`);
  console.log(`   Venue ID: ${venueId}\n`);

  // Check if already exists
  const existing = await discoveredVenues.findByDeliveryUrl(url);
  if (existing) {
    console.log(`⚠️ Venue already exists in database: ${existing.name} (ID: ${existing.id})`);
    console.log(`   Dishes: ${existing.dishes?.length || 0}`);
    return;
  }

  // Initialize Puppeteer fetcher
  const fetcher = new PuppeteerFetcher();
  await fetcher.init();

  try {
    console.log('📥 Fetching menu page...\n');

    // Fetch the page content
    const fetchResult = await fetcher.fetchPage(url, {
      venue_id: venueId,
      venue_name: venueName || venueId,
    });

    if (!fetchResult.success || !fetchResult.page) {
      console.error(`❌ Failed to fetch page: ${fetchResult.error}`);
      process.exit(1);
    }

    console.log(`   Fetched page: ${fetchResult.page.venue_name}`);
    console.log(`   HTML length: ${fetchResult.page.html?.length || 0} characters\n`);

    if (!fetchResult.page.html) {
      console.error('❌ No HTML content extracted from page');
      process.exit(1);
    }

    // Use AI to extract dishes
    console.log('🤖 Analyzing menu with AI...\n');
    const aiClient = new DishFinderAIClient({});
    const extractionResult = await aiClient.extractDishes(fetchResult.page);
    const extractedDishes = extractionResult.dishes;

    console.log(`\n   Found ${extractedDishes.length} Planted dishes\n`);

    if (extractedDishes.length === 0) {
      console.log('⚠️ No Planted dishes found. Adding venue anyway...');
    }

    // Create the discovered venue
    const createdVenue = await discoveredVenues.createVenue({
      discovery_run_id: 'manual-add',
      name: venueName || venueId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      is_chain: false,
      address: {
        city: 'Unknown',
        country: country as SupportedCountry,
      },
      delivery_platforms: [
        {
          platform,
          url,
          active: true,
          verified: false,
        },
      ],
      planted_products: [...new Set(extractedDishes.map(d => d.planted_product_guess))],
      dishes: extractedDishes.map(d => ({
        name: d.name,
        description: d.description,
        category: d.category || 'main',
        planted_product: d.planted_product_guess,
        price: d.price,
        is_vegan: d.is_vegan,
        confidence: d.product_confidence,
      })),
      confidence_score: extractedDishes.length > 0 ? 80 : 50,
      confidence_factors: [
        {
          factor: 'manual_add',
          score: 100,
          reason: 'Manually added venue',
        },
        {
          factor: 'dish_extraction',
          score: extractedDishes.length > 0 ? 90 : 30,
          reason: `Found ${extractedDishes.length} dishes`,
        },
      ],
      discovered_by_strategy_id: 'manual',
      discovered_by_query: `manual add: ${url}`,
    });

    console.log('\n✅ Venue added successfully!\n');
    console.log(`   ID: ${createdVenue.id}`);
    console.log(`   Name: ${createdVenue.name}`);
    console.log(`   Country: ${country}`);
    console.log(`   Dishes: ${createdVenue.dishes?.length || 0}`);

    if (extractedDishes.length > 0) {
      console.log('\n   Planted dishes found:');
      for (const dish of extractedDishes) {
        console.log(`   - ${dish.name} (${dish.planted_product_guess})`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error adding venue:', error);
    process.exit(1);
  } finally {
    await fetcher.close();
  }
}

main();
