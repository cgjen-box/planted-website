/**
 * Export Firestore discovered venues to Astro static file
 *
 * This script exports all discovered venues with dishes from Firestore
 * and generates the discoveredLocations.ts file for the Astro website.
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});

const db = getFirestore();

interface ChainLocation {
  id: string;
  chainId: string;
  chainName: string;
  name: string;
  city: string;
  address?: string;
  postalCode?: string;
  country: 'ch' | 'de' | 'at' | 'lu' | 'uk' | 'nl';
  coordinates: {
    lat: number;
    lng: number;
  };
  deliveryPlatforms: {
    name: string;
    url: string;
    displayName: string;
  }[];
  plantedProducts: string[];
  dishes?: {
    name: string;
    description?: string;
    price?: string;
    plantedProduct: string;
    isVegan?: boolean;
  }[];
}

// Map platform names to display names
const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  'uber-eats': 'Uber Eats',
  'lieferando': 'Lieferando',
  'just-eat': 'Just Eat',
  'wolt': 'Wolt',
  'smood': 'Smood',
};

// Map chain IDs to proper chain metadata
const CHAIN_METADATA: Record<string, { chainName: string; chainId: string }> = {
  'dean-david': { chainName: 'dean&david', chainId: 'dean-david' },
  'birdie-birdie': { chainName: 'Birdie Birdie Chicken', chainId: 'birdie-birdie' },
  'beets-roots': { chainName: 'beets&roots', chainId: 'beets-roots' },
  'green-club': { chainName: 'Green Club', chainId: 'green-club' },
  'rice-up': { chainName: 'Rice Up', chainId: 'rice-up' },
  'stadtsalat': { chainName: 'Stadtsalat', chainId: 'stadtsalat' },
  'doen-doen': { chainName: 'Doen Doen', chainId: 'doen-doen' },
  'chidoba': { chainName: 'chidoba', chainId: 'chidoba' },
  'nooch': { chainName: 'Nooch', chainId: 'nooch' },
  'rabowls': { chainName: 'Råbowls', chainId: 'rabowls' },
  'smash-bro': { chainName: 'Smash Bro', chainId: 'smash-bro' },
  'kaimug': { chainName: 'Kaimug', chainId: 'kaimug' },
  'cotidiano': { chainName: 'Cotidiano', chainId: 'cotidiano' },
  'yardbird': { chainName: 'Yardbird', chainId: 'yardbird' },
  'fat-monk': { chainName: 'Fat Monk', chainId: 'fat-monk' },
  'brezelkonig': { chainName: 'Brezelkönig', chainId: 'brezelkonig' },
  'tibits': { chainName: 'Tibits', chainId: 'tibits' },
  'hiltl': { chainName: 'Hiltl', chainId: 'hiltl' },
};

async function exportToAstro() {
  console.log('🚀 Exporting Firestore data to Astro...\n');

  // Fetch all discovered venues with status 'discovered' or 'verified'
  const venuesSnapshot = await db.collection('discovered_venues')
    .where('status', 'in', ['discovered', 'verified'])
    .get();

  console.log(`📦 Found ${venuesSnapshot.size} venues in Firestore\n`);

  const locations: ChainLocation[] = [];
  const chainCounts: Record<string, number> = {};

  for (const doc of venuesSnapshot.docs) {
    const venue = doc.data();

    // Skip venues without coordinates
    if (!venue.location?.latitude || !venue.location?.longitude) {
      continue;
    }

    // Map country code
    let country: 'ch' | 'de' | 'at' | 'lu' | 'uk' | 'nl' = 'de';
    const countryCode = venue.address?.country?.toLowerCase() || '';
    if (countryCode === 'ch' || countryCode === 'switzerland') country = 'ch';
    else if (countryCode === 'at' || countryCode === 'austria') country = 'at';
    else if (countryCode === 'lu' || countryCode === 'luxembourg') country = 'lu';
    else if (countryCode === 'uk' || countryCode === 'gb' || countryCode === 'united kingdom') country = 'uk';
    else if (countryCode === 'nl' || countryCode === 'netherlands') country = 'nl';
    else country = 'de';

    // Get chain info
    const chainId = venue.chain_id || 'independent';
    const chainMeta = CHAIN_METADATA[chainId] || { chainName: venue.chain_name || venue.name, chainId };

    // Track chain counts
    chainCounts[chainMeta.chainName] = (chainCounts[chainMeta.chainName] || 0) + 1;

    // Build delivery platforms
    const deliveryPlatforms: ChainLocation['deliveryPlatforms'] = [];
    if (venue.source?.url) {
      const platform = venue.source.type || 'unknown';
      deliveryPlatforms.push({
        name: platform,
        url: venue.source.url,
        displayName: PLATFORM_DISPLAY_NAMES[platform] || platform,
      });
    }

    // Build dishes from embedded dishes array
    const dishes: ChainLocation['dishes'] = [];
    if (venue.dishes && Array.isArray(venue.dishes)) {
      for (const dish of venue.dishes) {
        dishes.push({
          name: dish.name,
          description: dish.description,
          price: dish.price?.amount ? `${dish.price.currency || '€'}${dish.price.amount}` : undefined,
          plantedProduct: dish.planted_products?.[0] || 'planted.chicken',
          isVegan: true,
        });
      }
    }

    // Build planted products list
    const plantedProducts: string[] = venue.planted_products || [];
    if (plantedProducts.length === 0 && dishes.length > 0) {
      // Extract from dishes
      dishes.forEach(d => {
        if (d.plantedProduct && !plantedProducts.includes(d.plantedProduct)) {
          plantedProducts.push(d.plantedProduct);
        }
      });
    }
    if (plantedProducts.length === 0) {
      plantedProducts.push('planted.chicken'); // Default
    }

    // Create location entry
    const location: ChainLocation = {
      id: doc.id,
      chainId: chainMeta.chainId,
      chainName: chainMeta.chainName,
      name: venue.name,
      city: venue.address?.city || 'Unknown',
      address: venue.address?.street,
      postalCode: venue.address?.postal_code,
      country,
      coordinates: {
        lat: venue.location.latitude,
        lng: venue.location.longitude,
      },
      deliveryPlatforms,
      plantedProducts,
    };

    // Add dishes if present
    if (dishes.length > 0) {
      location.dishes = dishes;
    }

    locations.push(location);
  }

  console.log('📊 Chain breakdown:');
  Object.entries(chainCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([chain, count]) => {
      console.log(`   ${chain}: ${count} locations`);
    });

  // Generate TypeScript file
  const tsContent = `import type { ChainLocation } from './chainRestaurants';

/**
 * Chain Restaurant Locations - Auto-generated from Firestore
 * Generated: ${new Date().toISOString()}
 * Total locations: ${locations.length}
 */

// Additional chain locations discovered via Smart Discovery Agent
export const discoveredChainLocations: ChainLocation[] = ${JSON.stringify(locations, null, 2)
    .replace(/"([^"]+)":/g, '$1:')  // Remove quotes from keys
    .replace(/"/g, "'")  // Use single quotes for strings
};
`;

  // Write to Astro data directory
  const outputPath = path.join(__dirname, '..', '..', 'planted-astro', 'src', 'data', 'discoveredLocations.ts');
  fs.writeFileSync(outputPath, tsContent);

  console.log(`\n✅ Exported ${locations.length} locations to:`);
  console.log(`   ${outputPath}`);
  console.log('\n🔄 Now rebuild and deploy the Astro site to see changes on the website.');
}

exportToAstro().catch(console.error);
