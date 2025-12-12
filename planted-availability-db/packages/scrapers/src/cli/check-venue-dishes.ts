#!/usr/bin/env npx tsx

/**
 * Quick script to check venues and their dishes
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

async function run() {
  console.log('Fetching dishes...\n');

  const dishesSnap = await db.collection('dishes').limit(15).get();
  const venueIds = new Set<string>();

  for (const doc of dishesSnap.docs) {
    const data = doc.data();
    venueIds.add(data.venue_id);
  }

  console.log('--- Venues with dishes ---\n');

  for (const venueId of venueIds) {
    const venueDoc = await db.collection('venues').doc(venueId).get();
    if (venueDoc.exists) {
      const v = venueDoc.data()!;
      const dishCount = await db.collection('dishes').where('venue_id', '==', venueId).count().get();
      console.log(`✅ ${v.name}`);
      console.log(`   ID: ${venueId}`);
      console.log(`   City: ${v.address?.city || 'N/A'}`);
      console.log(`   Dishes: ${dishCount.data().count}`);
      console.log('');
    } else {
      console.log(`❌ Venue not found: ${venueId}`);
    }
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
