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

// Image URLs extracted from Uber Eats
const DISH_IMAGES: Record<string, string> = {
  'CRISPY planted. Menu': 'https://tb-static.uber.com/prod/image-proc/processed_images/ecff5d1857f9cdcf73e9f526b9710e77/c67fc65e9b4e16a553eb7574fba090f1.jpeg',
  'CRISPY planted. BURGER': 'https://tb-static.uber.com/prod/image-proc/processed_images/ecff5d1857f9cdcf73e9f526b9710e77/c67fc65e9b4e16a553eb7574fba090f1.jpeg',
  'CRISPY planted. SALAD': 'https://tb-static.uber.com/prod/image-proc/processed_images/7a4db244316b773b40270caad743085c/c67fc65e9b4e16a553eb7574fba090f1.jpeg',
};

async function main() {
  console.log('🖼️  Updating BURGERMEISTER dish images...\n');

  // Step 1: Update production dishes
  console.log('Step 1: Updating production dishes with images...');
  const productionDishes = await db.collection('dishes')
    .where('venue_id', '==', VENUE_ID)
    .get();

  console.log(`  Found ${productionDishes.size} production dishes`);

  for (const doc of productionDishes.docs) {
    const dish = doc.data();
    const imageUrl = DISH_IMAGES[dish.name];

    if (imageUrl) {
      console.log(`  ✅ ${dish.name}: Adding image`);
      await doc.ref.update({
        image_url: imageUrl,
        updated_at: FieldValue.serverTimestamp(),
      });
    } else {
      console.log(`  ⚠️  ${dish.name}: No matching image found`);
    }
  }

  // Step 2: Update discovered_venues.dishes
  console.log('\nStep 2: Updating discovered_venues with dish images...');
  const discoveredVenues = await db.collection('discovered_venues')
    .where('production_venue_id', '==', VENUE_ID)
    .get();

  for (const doc of discoveredVenues.docs) {
    const data = doc.data();
    console.log(`  Updating: ${data.name}`);

    if (data.dishes && Array.isArray(data.dishes)) {
      const updatedDishes = data.dishes.map((dish: any) => {
        const imageUrl = DISH_IMAGES[dish.name];
        if (imageUrl) {
          return { ...dish, image_url: imageUrl };
        }
        return dish;
      });

      await doc.ref.update({
        dishes: updatedDishes,
        dishes_updated_at: FieldValue.serverTimestamp(),
      });
    }
  }

  // Verify final state
  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION - Final State:');
  console.log('='.repeat(50));

  const finalDishes = await db.collection('dishes')
    .where('venue_id', '==', VENUE_ID)
    .get();

  console.log(`\nProduction dishes (${finalDishes.size}):`);
  finalDishes.docs.forEach((doc, i) => {
    const d = doc.data();
    console.log(`  ${i + 1}. ${d.name}`);
    console.log(`     Price: ${d.currency} ${d.price}`);
    console.log(`     Image: ${d.image_url ? '✅ Yes' : '❌ No'}`);
  });

  console.log('\n✅ BURGERMEISTER image update complete!');
}

main().catch(console.error);
