#!/usr/bin/env node
/**
 * Sync verified venues from Firestore to the Astro website
 *
 * This script:
 * 1. Fetches all verified venues from Firestore
 * 2. Deduplicates by URL
 * 3. Groups by chain
 * 4. Generates TypeScript code for chainRestaurants.ts
 */

const path = require('path');
const fs = require('fs');

// Set up Firebase credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, '..', 'service-account.json');

// City coordinates for geocoding
const CITY_COORDS = {
  // Germany
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'München': { lat: 48.1351, lng: 11.5820 },
  'Munich': { lat: 48.1351, lng: 11.5820 },
  'Hamburg': { lat: 53.5511, lng: 9.9937 },
  'Frankfurt': { lat: 50.1109, lng: 8.6821 },
  'Köln': { lat: 50.9375, lng: 6.9603 },
  'Stuttgart': { lat: 48.7758, lng: 9.1829 },
  'Düsseldorf': { lat: 51.2277, lng: 6.7735 },
  'Leipzig': { lat: 51.3397, lng: 12.3731 },
  'Nürnberg': { lat: 49.4521, lng: 11.0767 },
  'Mainz': { lat: 49.9929, lng: 8.2473 },
  'Essen': { lat: 51.4556, lng: 7.0116 },
  'Kiel': { lat: 54.3233, lng: 10.1228 },
  'Konstanz': { lat: 47.6603, lng: 9.1758 },
  'Rostock': { lat: 54.0887, lng: 12.1407 },
  'Rotterdam': { lat: 51.9244, lng: 4.4777 },
  // Switzerland
  'Zürich': { lat: 47.3769, lng: 8.5417 },
  'Basel': { lat: 47.5596, lng: 7.5886 },
  'Bern': { lat: 46.9480, lng: 7.4474 },
  'Genf': { lat: 46.2044, lng: 6.1432 },
  'Geneva': { lat: 46.2044, lng: 6.1432 },
  'Lausanne': { lat: 46.5197, lng: 6.6323 },
  'Luzern': { lat: 47.0502, lng: 8.3093 },
  'Muri bei Bern': { lat: 46.9333, lng: 7.4833 },
  // Austria
  'Wien': { lat: 48.2082, lng: 16.3738 },
  'Vienna': { lat: 48.2082, lng: 16.3738 },
  'Salzburg': { lat: 47.8095, lng: 13.0550 },
  'Graz': { lat: 47.0707, lng: 15.4395 },
};

// Chain configurations
const CHAIN_CONFIG = {
  'dean&david': {
    id: 'dean-david',
    name: 'dean&david',
    chainId: 'dean-david',
    products: ['planted.chicken', 'planted.duck'],
    cuisine: 'Healthy Bowls & Salads',
  },
  'birdie birdie': {
    id: 'birdie-birdie',
    name: 'Birdie Birdie Chicken',
    chainId: 'birdie-birdie',
    products: ['planted.chicken_burger', 'planted.chicken_tenders'],
    cuisine: 'Fried Chicken',
  },
  'beets&roots': {
    id: 'beets-roots',
    name: 'beets&roots',
    chainId: 'beets-roots',
    products: ['planted.chicken', 'planted.steak'],
    cuisine: 'Healthy Bowls',
  },
  'beets and roots': {
    id: 'beets-roots',
    name: 'beets&roots',
    chainId: 'beets-roots',
    products: ['planted.chicken', 'planted.steak'],
    cuisine: 'Healthy Bowls',
  },
  'green club': {
    id: 'green-club',
    name: 'Green Club',
    chainId: 'green-club',
    products: ['planted.chicken', 'planted.kebab', 'planted.pastrami'],
    cuisine: 'Healthy Fast Food',
  },
  'nooch': {
    id: 'nooch',
    name: 'Nooch Asian Kitchen',
    chainId: 'nooch',
    products: ['planted.chicken'],
    cuisine: 'Asian Kitchen',
  },
  'rice up': {
    id: 'rice-up',
    name: 'Rice Up!',
    chainId: 'rice-up',
    products: ['planted.chicken'],
    cuisine: 'Asian Bowls',
  },
  'doen doen': {
    id: 'doen-doen',
    name: 'Doen Doen Planted Kebap',
    chainId: 'doen-doen',
    products: ['planted.kebab', 'planted.chicken'],
    cuisine: 'Kebab',
  },
  'kaspar schmauser': {
    id: 'kaspar-schmauser',
    name: 'Kaspar Schmauser',
    chainId: 'kaspar-schmauser',
    products: ['planted.chicken', 'planted.kebab', 'planted.steak'],
    cuisine: 'German Comfort Food',
  },
  'kaisin': {
    id: 'kaisin',
    name: 'kaisin.',
    chainId: 'kaisin',
    products: ['planted.chicken'],
    cuisine: 'Asian Fusion',
  },
  'veganitas': {
    id: 'veganitas',
    name: 'Veganitas',
    chainId: 'veganitas',
    products: ['planted.steak', 'planted.chicken'],
    cuisine: 'Vegan',
  },
  'cotidiano': {
    id: 'cotidiano',
    name: 'Cotidiano',
    chainId: 'cotidiano',
    products: ['planted.chicken_burger', 'planted.pastrami'],
    cuisine: 'Café & Restaurant',
  },
  'tibits': {
    id: 'tibits',
    name: 'Tibits',
    chainId: 'tibits',
    products: ['planted.chicken'],
    cuisine: 'Vegetarian Buffet',
  },
  'hiltl': {
    id: 'hiltl',
    name: 'Hiltl',
    chainId: 'hiltl',
    products: ['planted.chicken'],
    cuisine: 'Vegetarian World Cuisine',
  },
};

function getChainConfig(name) {
  const lower = name.toLowerCase();
  for (const [pattern, config] of Object.entries(CHAIN_CONFIG)) {
    if (lower.includes(pattern)) {
      return config;
    }
  }
  return null;
}

function getCoordinates(city) {
  // Try exact match first
  if (CITY_COORDS[city]) {
    return CITY_COORDS[city];
  }
  // Try case-insensitive
  for (const [name, coords] of Object.entries(CITY_COORDS)) {
    if (name.toLowerCase() === city.toLowerCase()) {
      return coords;
    }
  }
  // Default to Berlin if unknown
  console.warn(`Unknown city: ${city}, using default coordinates`);
  return { lat: 52.5200, lng: 13.4050 };
}

function mapPlatformName(platform) {
  const map = {
    'uber-eats': 'uber-eats',
    'just-eat': 'just-eat',
    'lieferando': 'lieferando',
    'wolt': 'wolt',
    'smood': 'smood',
    'website': 'own',
  };
  return map[platform] || 'uber-eats';
}

function getPlatformDisplayName(platform) {
  const map = {
    'uber-eats': 'Uber Eats',
    'just-eat': 'Just Eat',
    'lieferando': 'Lieferando',
    'wolt': 'Wolt',
    'smood': 'Smood',
    'own': 'Website',
  };
  return map[platform] || platform;
}

function generateId(name, city, index) {
  const cleanName = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20);
  const cleanCity = city.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 10);
  return `${cleanName}-${cleanCity}-${index}`;
}

async function main() {
  const { discoveredVenues } = require('../packages/database/dist');

  console.log('🔄 Fetching verified venues from Firestore...');

  const allVenues = await discoveredVenues.getAll();
  const verified = allVenues.filter(v => v.status === 'verified');

  console.log(`✅ Found ${verified.length} verified venues`);

  // Deduplicate by URL
  const seenUrls = new Set();
  const uniqueVenues = verified.filter(v => {
    const url = v.delivery_platforms?.[0]?.url;
    if (!url || seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });

  console.log(`📋 After deduplication: ${uniqueVenues.length} unique venues`);

  // Group by chain
  const chainLocations = {};
  const standaloneLocations = [];
  let locationIndex = 0;

  for (const venue of uniqueVenues) {
    const chainConfig = getChainConfig(venue.name);
    const city = venue.address?.city || 'Unknown';
    const country = (venue.address?.country || 'DE').toLowerCase();
    const coords = getCoordinates(city);
    const platform = mapPlatformName(venue.delivery_platforms?.[0]?.platform);
    const url = venue.delivery_platforms?.[0]?.url || '';

    const location = {
      id: generateId(venue.name, city, locationIndex++),
      chainId: chainConfig?.chainId || 'standalone',
      chainName: chainConfig?.name || venue.name,
      name: venue.name,
      city: city,
      country: country,
      coordinates: coords,
      deliveryPlatforms: [{
        name: platform,
        url: url,
        displayName: getPlatformDisplayName(platform),
      }],
      plantedProducts: venue.planted_products || chainConfig?.products || ['planted.chicken'],
    };

    if (chainConfig) {
      if (!chainLocations[chainConfig.chainId]) {
        chainLocations[chainConfig.chainId] = {
          config: chainConfig,
          locations: [],
        };
      }
      chainLocations[chainConfig.chainId].locations.push(location);
    } else {
      standaloneLocations.push(location);
    }
  }

  // Generate TypeScript code
  let tsCode = `/**
 * Chain Restaurant Locations - Auto-generated from Firestore
 * Generated: ${new Date().toISOString()}
 * Total locations: ${uniqueVenues.length}
 */

// Additional chain locations discovered via Smart Discovery Agent
export const discoveredChainLocations: ChainLocation[] = [
`;

  // Add chain locations
  for (const [chainId, data] of Object.entries(chainLocations)) {
    tsCode += `  // ============================================\n`;
    tsCode += `  // ${data.config.name.toUpperCase()} (${data.locations.length} locations)\n`;
    tsCode += `  // ============================================\n`;

    for (const loc of data.locations) {
      tsCode += `  {\n`;
      tsCode += `    id: '${loc.id}',\n`;
      tsCode += `    chainId: '${loc.chainId}',\n`;
      tsCode += `    chainName: '${loc.chainName}',\n`;
      tsCode += `    name: '${loc.name.replace(/'/g, "\\'")}',\n`;
      tsCode += `    city: '${loc.city}',\n`;
      tsCode += `    country: '${loc.country}',\n`;
      tsCode += `    coordinates: { lat: ${loc.coordinates.lat}, lng: ${loc.coordinates.lng} },\n`;
      tsCode += `    deliveryPlatforms: [\n`;
      for (const p of loc.deliveryPlatforms) {
        tsCode += `      { name: '${p.name}', url: '${p.url}', displayName: '${p.displayName}' },\n`;
      }
      tsCode += `    ],\n`;
      tsCode += `    plantedProducts: [${loc.plantedProducts.map(p => `'${p}'`).join(', ')}],\n`;
      tsCode += `  },\n`;
    }
  }

  // Add standalone locations
  if (standaloneLocations.length > 0) {
    tsCode += `  // ============================================\n`;
    tsCode += `  // STANDALONE VENUES (${standaloneLocations.length} locations)\n`;
    tsCode += `  // ============================================\n`;

    for (const loc of standaloneLocations) {
      tsCode += `  {\n`;
      tsCode += `    id: '${loc.id}',\n`;
      tsCode += `    chainId: 'standalone',\n`;
      tsCode += `    chainName: '${loc.chainName.replace(/'/g, "\\'")}',\n`;
      tsCode += `    name: '${loc.name.replace(/'/g, "\\'")}',\n`;
      tsCode += `    city: '${loc.city}',\n`;
      tsCode += `    country: '${loc.country}',\n`;
      tsCode += `    coordinates: { lat: ${loc.coordinates.lat}, lng: ${loc.coordinates.lng} },\n`;
      tsCode += `    deliveryPlatforms: [\n`;
      for (const p of loc.deliveryPlatforms) {
        tsCode += `      { name: '${p.name}', url: '${p.url}', displayName: '${p.displayName}' },\n`;
      }
      tsCode += `    ],\n`;
      tsCode += `    plantedProducts: [${loc.plantedProducts.map(p => `'${p}'`).join(', ')}],\n`;
      tsCode += `  },\n`;
    }
  }

  tsCode += `];\n`;

  // Write to file
  const outputPath = path.join(__dirname, '..', '..', 'planted-astro', 'src', 'data', 'discoveredLocations.ts');

  // Add the import type at the top
  const fullCode = `import type { ChainLocation } from './chainRestaurants';\n\n${tsCode}`;

  fs.writeFileSync(outputPath, fullCode);
  console.log(`\n✅ Generated: ${outputPath}`);

  // Print summary
  console.log('\n📊 Summary:');
  console.log(`   Total unique locations: ${uniqueVenues.length}`);
  console.log(`   Chains: ${Object.keys(chainLocations).length}`);
  for (const [chainId, data] of Object.entries(chainLocations)) {
    console.log(`     - ${data.config.name}: ${data.locations.length} locations`);
  }
  console.log(`   Standalone: ${standaloneLocations.length}`);
}

main().catch(console.error);
