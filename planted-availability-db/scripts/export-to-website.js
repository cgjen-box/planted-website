#!/usr/bin/env node
/**
 * Export verified venues from Firestore to the website data files
 *
 * This script:
 * 1. Fetches all verified venues from Firestore
 * 2. Groups them by chain
 * 3. Generates TypeScript data files for the Astro website
 */

const path = require('path');

// Set up Firebase credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '..', 'service-account.json');

async function main() {
  const { discoveredVenues } = require('../packages/database/dist');

  console.log('🔄 Fetching verified venues from Firestore...');

  const allVenues = await discoveredVenues.getAll();
  const verified = allVenues.filter(v => v.status === 'verified');

  console.log(`✅ Found ${verified.length} verified venues`);

  // Group by chain
  const chains = new Map();
  const standalone = [];

  for (const venue of verified) {
    if (venue.is_chain && venue.chain_name) {
      const chainKey = venue.chain_name.toLowerCase();
      if (!chains.has(chainKey)) {
        chains.set(chainKey, {
          name: venue.chain_name,
          locations: [],
          products: new Set(),
        });
      }
      chains.get(chainKey).locations.push(venue);
      venue.planted_products?.forEach(p => chains.get(chainKey).products.add(p));
    } else {
      standalone.push(venue);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Chains: ${chains.size}`);
  console.log(`   Standalone venues: ${standalone.length}`);

  // Print chain details
  console.log(`\n🔗 Chains:`);
  for (const [key, chain] of chains) {
    console.log(`   ${chain.name}: ${chain.locations.length} locations`);
    console.log(`      Products: ${Array.from(chain.products).join(', ')}`);
  }

  // Print standalone venues
  console.log(`\n🏪 Standalone Venues:`);
  for (const venue of standalone.slice(0, 20)) {
    const products = venue.planted_products?.join(', ') || 'unknown';
    console.log(`   ${venue.name} (${venue.address?.city}, ${venue.address?.country}) - ${products}`);
  }
  if (standalone.length > 20) {
    console.log(`   ... and ${standalone.length - 20} more`);
  }

  // Generate export data
  const exportData = {
    chains: Array.from(chains.values()).map(c => ({
      name: c.name,
      locationCount: c.locations.length,
      products: Array.from(c.products),
      locations: c.locations.map(l => ({
        name: l.name,
        city: l.address?.city,
        country: l.address?.country,
        url: l.delivery_platforms?.[0]?.url,
        platform: l.delivery_platforms?.[0]?.platform,
        products: l.planted_products,
      })),
    })),
    standalone: standalone.map(v => ({
      name: v.name,
      city: v.address?.city,
      country: v.address?.country,
      url: v.delivery_platforms?.[0]?.url,
      platform: v.delivery_platforms?.[0]?.platform,
      products: v.planted_products,
    })),
  };

  console.log(`\n📝 Export data ready. Total entries: ${verified.length}`);
  console.log(JSON.stringify(exportData, null, 2));
}

main().catch(console.error);
