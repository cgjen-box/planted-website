/**
 * Script to auto-assign chains to discovered venues
 * Run with: npx ts-node scripts/auto-assign-chains.ts [--dry-run]
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Known chain patterns
const KNOWN_CHAIN_PATTERNS: Record<string, string> = {
  'dean&david': 'Dean & David',
  'dean & david': 'Dean & David',
  'dean david': 'Dean & David',
  'deanddavid': 'Dean & David',
  'birdie birdie': 'Birdie Birdie',
  'birdiebirdie': 'Birdie Birdie',
  'birdie-birdie': 'Birdie Birdie',
  'beets&roots': 'Beets & Roots',
  'beets & roots': 'Beets & Roots',
  'beets and roots': 'Beets & Roots',
  'beetsandroots': 'Beets & Roots',
  'green club': 'Green Club',
  'greenclub': 'Green Club',
  'nooch asian kitchen': 'Nooch',
  'nooch asian': 'Nooch',
  'nooch': 'Nooch',
  'rice up': 'Rice Up',
  'rice up!': 'Rice Up',
  'riceup': 'Rice Up',
  'smash bro': 'Smash Bro',
  'smashbro': 'Smash Bro',
  'doen doen': 'Doen Doen',
  'doendoen': 'Doen Doen',
  'hiltl': 'Hiltl',
  'haus hiltl': 'Hiltl',
  'tibits': 'Tibits',
  'kaimug': 'Kaimug',
  'stadtsalat': 'Stadtsalat',
  'råbowls': 'Råbowls',
  'rabowls': 'Råbowls',
  'chidoba': 'Chidoba',
  'hans im glück': 'Hans im Glück',
  'hans im glueck': 'Hans im Glück',
  'vapiano': 'Vapiano',
  'cotidiano': 'Cotidiano',
  'yardbird': 'Yardbird',
  'brezelkönig': 'Brezelkönig',
  'brezelkoenig': 'Brezelkönig',
  'brezelkonig': 'Brezelkönig',
};

function findChainMatch(venueName: string): { canonicalName: string; pattern: string } | null {
  const lowerName = venueName.toLowerCase();
  const sortedPatterns = Object.entries(KNOWN_CHAIN_PATTERNS)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [pattern, canonicalName] of sortedPatterns) {
    if (lowerName.includes(pattern)) {
      return { canonicalName, pattern };
    }
  }
  return null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`\n🔗 Auto-Assign Chains Script`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'EXECUTE'}\n`);

  // Initialize Firebase
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(__dirname, '..', 'service-account.json');

  try {
    initializeApp({
      credential: cert(serviceAccountPath),
      projectId: 'get-planted-db',
    });
  } catch (e) {
    // App might already be initialized
  }

  const db = getFirestore();

  // Get all discovered venues without chain_id
  console.log('📊 Fetching discovered venues...');
  const venuesSnapshot = await db.collection('discovered_venues').get();
  const allVenues = venuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const venuesWithoutChain = allVenues.filter((v: any) => !v.chain_id);

  console.log(`   Total venues: ${allVenues.length}`);
  console.log(`   Venues without chain: ${venuesWithoutChain.length}\n`);

  // Get all existing chains
  console.log('📊 Fetching existing chains...');
  const chainsSnapshot = await db.collection('chains').get();
  const existingChains = new Map<string, { id: string; name: string }>();
  chainsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    existingChains.set(data.name.toLowerCase(), { id: doc.id, name: data.name });
  });
  console.log(`   Found ${existingChains.size} existing chains\n`);

  // Find matches
  const matches: Array<{
    venueId: string;
    venueName: string;
    chainName: string;
    chainId: string;
    pattern: string;
    isNewChain: boolean;
  }> = [];
  const chainsToCreate = new Map<string, string[]>();

  for (const venue of venuesWithoutChain as any[]) {
    const match = findChainMatch(venue.name);
    if (match) {
      const existingChain = existingChains.get(match.canonicalName.toLowerCase());
      if (existingChain) {
        matches.push({
          venueId: venue.id,
          venueName: venue.name,
          chainName: existingChain.name,
          chainId: existingChain.id,
          pattern: match.pattern,
          isNewChain: false,
        });
      } else {
        if (!chainsToCreate.has(match.canonicalName)) {
          chainsToCreate.set(match.canonicalName, []);
        }
        chainsToCreate.get(match.canonicalName)!.push(venue.id);
        matches.push({
          venueId: venue.id,
          venueName: venue.name,
          chainName: match.canonicalName,
          chainId: '',
          pattern: match.pattern,
          isNewChain: true,
        });
      }
    }
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                        SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Venues matched: ${matches.length} / ${venuesWithoutChain.length}`);
  console.log(`Using existing chains: ${matches.filter(m => !m.isNewChain).length}`);
  console.log(`New chains to create: ${chainsToCreate.size}`);
  console.log('');

  // Group by chain for display
  const byChain = new Map<string, typeof matches>();
  for (const match of matches) {
    if (!byChain.has(match.chainName)) {
      byChain.set(match.chainName, []);
    }
    byChain.get(match.chainName)!.push(match);
  }

  console.log('Matches by chain:');
  for (const [chainName, chainMatches] of Array.from(byChain).sort((a, b) => b[1].length - a[1].length)) {
    const isNew = chainMatches[0].isNewChain;
    console.log(`  ${isNew ? '🆕' : '✅'} ${chainName}: ${chainMatches.length} venues`);
    // Show first 3 venue names as examples
    for (const m of chainMatches.slice(0, 3)) {
      console.log(`      - ${m.venueName}`);
    }
    if (chainMatches.length > 3) {
      console.log(`      ... and ${chainMatches.length - 3} more`);
    }
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes made. Run without --dry-run to execute.\n');
    return;
  }

  // Execute changes
  console.log('\n🚀 Executing changes...\n');

  // Create new chains first
  for (const [chainName] of chainsToCreate) {
    console.log(`Creating chain: ${chainName}`);
    const newChainRef = db.collection('chains').doc();
    await newChainRef.set({
      name: chainName,
      type: 'restaurant',
      markets: [],
      created_at: new Date(),
    });
    existingChains.set(chainName.toLowerCase(), { id: newChainRef.id, name: chainName });

    // Update matches with new chain ID
    for (const match of matches) {
      if (match.chainName === chainName && match.isNewChain) {
        match.chainId = newChainRef.id;
      }
    }
  }

  // Update venues
  let updatedCount = 0;
  for (const match of matches) {
    if (!match.chainId) continue;

    await db.collection('discovered_venues').doc(match.venueId).update({
      chain_id: match.chainId,
      chain_name: match.chainName,
      is_chain: true,
    });
    updatedCount++;

    if (updatedCount % 10 === 0) {
      console.log(`   Updated ${updatedCount} / ${matches.length} venues...`);
    }
  }

  console.log(`\n✅ Done! Updated ${updatedCount} venues.`);
  console.log(`   Created ${chainsToCreate.size} new chains.`);
}

main().catch(console.error);
