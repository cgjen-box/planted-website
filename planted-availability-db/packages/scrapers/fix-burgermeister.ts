import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// Fix service account path
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(process.cwd(), '../../service-account.json');

import { initializeFirestore } from '@pad/database';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeFirestore();
const db = getFirestore();

const VENUE_ID = 'cbjKUSpNDUWWgS1l3nNT';

// Correct dishes from Uber Eats visual verification
// NOTE: Use { amount, currency } format for prices (matches Dish type schema)
const CORRECT_DISHES = [
  {
    name: 'CRISPY planted. Menu',
    price: { amount: 33.40, currency: 'CHF' },
    description: 'Burger menu with sides',
    image_url: 'https://tb-static.uber.com/prod/image-proc/processed_images/ecff5d1857f9cdcf73e9f526b9710e77/c67fc65e9b4e16a553eb7574fba090f1.jpeg',
    planted_products: ['planted.chicken'],
    status: 'active',
  },
  {
    name: 'CRISPY planted. BURGER',
    price: { amount: 22.50, currency: 'CHF' },
    description: 'Single crispy planted burger',
    image_url: 'https://tb-static.uber.com/prod/image-proc/processed_images/ecff5d1857f9cdcf73e9f526b9710e77/c67fc65e9b4e16a553eb7574fba090f1.jpeg',
    planted_products: ['planted.chicken'],
    status: 'active',
  },
  {
    name: 'CRISPY planted. SALAD',
    price: { amount: 24.90, currency: 'CHF' },
    description: 'Salad with planted',
    image_url: 'https://tb-static.uber.com/prod/image-proc/processed_images/7a4db244316b773b40270caad743085c/c67fc65e9b4e16a553eb7574fba090f1.jpeg',
    planted_products: ['planted.chicken'],
    status: 'active',
  },
];

async function main() {
  console.log('🔧 Fixing BURGERMEISTER dishes...\n');

  // Step 1: Delete all production dishes for this venue
  console.log('Step 1: Deleting incorrect production dishes...');
  const productionDishes = await db.collection('dishes')
    .where('venue_id', '==', VENUE_ID)
    .get();

  console.log(`  Found ${productionDishes.size} production dishes to delete`);

  const batch1 = db.batch();
  for (const doc of productionDishes.docs) {
    console.log(`  - Deleting: ${doc.data().name} (${doc.id})`);
    batch1.delete(doc.ref);
  }
  await batch1.commit();
  console.log('  ✅ Production dishes deleted\n');

  // Step 2: Update discovered_venues.dishes with correct data
  console.log('Step 2: Updating discovered_venues with correct dishes...');
  const discoveredVenues = await db.collection('discovered_venues')
    .where('production_venue_id', '==', VENUE_ID)
    .get();

  for (const doc of discoveredVenues.docs) {
    console.log(`  Updating discovered venue: ${doc.data().name}`);
    await doc.ref.update({
      dishes: CORRECT_DISHES,
      dishes_updated_at: FieldValue.serverTimestamp(),
    });
  }
  console.log('  ✅ Discovered venues updated\n');

  // Step 3: Delete discovered_dishes for this venue
  console.log('Step 3: Deleting incorrect discovered_dishes...');
  const discoveredDishes = await db.collection('discovered_dishes')
    .where('venue_id', '==', VENUE_ID)
    .get();

  console.log(`  Found ${discoveredDishes.size} discovered_dishes to delete`);

  if (discoveredDishes.size > 0) {
    const batch2 = db.batch();
    for (const doc of discoveredDishes.docs) {
      console.log(`  - Deleting: ${doc.data().name} (${doc.id})`);
      batch2.delete(doc.ref);
    }
    await batch2.commit();
  }
  console.log('  ✅ Discovered dishes deleted\n');

  // Step 4: Create new production dishes
  console.log('Step 4: Creating correct production dishes...');

  for (const dish of CORRECT_DISHES) {
    const newDishRef = db.collection('dishes').doc();
    await newDishRef.set({
      ...dish,
      venue_id: VENUE_ID,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      source: 'manual_qa_fix',
      verified: true,
    });
    console.log(`  + Created: ${dish.name} (${newDishRef.id})`);
  }
  console.log('  ✅ Production dishes created\n');

  // Verify final state
  console.log('='.repeat(50));
  console.log('📊 VERIFICATION - Final State:');
  console.log('='.repeat(50));

  const finalDishes = await db.collection('dishes')
    .where('venue_id', '==', VENUE_ID)
    .get();

  console.log(`\nProduction dishes (${finalDishes.size}):`);
  finalDishes.docs.forEach((doc, i) => {
    const d = doc.data();
    console.log(`  ${i + 1}. ${d.name} - ${d.currency} ${d.price}`);
  });

  const finalDiscovered = await db.collection('discovered_venues')
    .where('production_venue_id', '==', VENUE_ID)
    .get();

  for (const doc of finalDiscovered.docs) {
    const data = doc.data();
    console.log(`\nDiscovered venue dishes (${data.dishes?.length || 0}):`);
    data.dishes?.forEach((d: any, i: number) => {
      console.log(`  ${i + 1}. ${d.name} - ${d.currency} ${d.price}`);
    });
  }

  console.log('\n✅ BURGERMEISTER fix complete!');
  console.log('\nPlease verify at: https://get-planted-db.web.app/live-venues');
}

main().catch(console.error);
