const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./service-account.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function clearAllDishes() {
  console.log('=== CLEARING ALL DISHES ===\n');

  // 1. Count and delete discovered_dishes collection
  const dishesSnapshot = await db.collection('discovered_dishes').get();
  console.log(`Found ${dishesSnapshot.size} dishes in discovered_dishes collection`);

  if (dishesSnapshot.size > 0) {
    const batchSize = 500;
    let deleted = 0;
    const docs = dishesSnapshot.docs;

    while (deleted < docs.length) {
      const batch = db.batch();
      const toDelete = docs.slice(deleted, deleted + batchSize);
      toDelete.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deleted += toDelete.length;
      console.log(`  Deleted ${deleted}/${docs.length} dishes`);
    }
    console.log('✅ All dishes deleted from discovered_dishes collection\n');
  }

  // 2. Clear dishes array on all venues
  const venuesSnapshot = await db.collection('discovered_venues').get();
  console.log(`Found ${venuesSnapshot.size} venues to clear dishes from`);

  let venuesCleared = 0;
  let venuesWithDishes = 0;

  for (const doc of venuesSnapshot.docs) {
    const data = doc.data();
    if (data.dishes && data.dishes.length > 0) {
      await doc.ref.update({ dishes: [] });
      venuesWithDishes++;
    }
    venuesCleared++;
    if (venuesCleared % 50 === 0) {
      console.log(`  Processed ${venuesCleared}/${venuesSnapshot.size} venues`);
    }
  }

  console.log(`✅ Cleared dishes from ${venuesWithDishes} venues (${venuesCleared} total processed)\n`);
  console.log('=== DONE! All dishes cleared ===');
}

clearAllDishes().catch(console.error);
