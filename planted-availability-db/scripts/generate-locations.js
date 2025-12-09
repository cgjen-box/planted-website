const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/planted-restaurants.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Get Barburrito locations
const barburrito = data.filter(r => r.name.includes('Barburrito'));

// Get unique Brezelkönig locations (by coordinates)
const brezelkoenig = data.filter(r => r.name.toLowerCase().includes('brezelk'));
const seen = new Set();
const uniqueBrezel = brezelkoenig.filter(r => {
  const key = r.coordinates.lat.toFixed(4) + '_' + r.coordinates.lng.toFixed(4);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Helper to create ID from name
function createId(prefix, name) {
  return prefix + '-' + name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
}

// Helper to fix city names
function fixCity(city, name) {
  if (['England', 'Scotland', 'Wales'].includes(city)) {
    if (name.includes('Edinburgh')) return 'Edinburgh';
    if (name.includes('Glasgow')) return 'Glasgow';
    if (name.includes('Liverpool')) return 'Liverpool';
    if (name.includes('Manchester')) return 'Manchester';
    if (name.includes('Nottingham')) return 'Nottingham';
    if (name.includes('Sheffield')) return 'Sheffield';
    if (name.includes('Cardiff')) return 'Cardiff';
    if (name.includes('Paddington')) return 'London';
    if (name.includes('Trafford')) return 'Manchester';
  }
  return city;
}

// Generate Barburrito entries
console.log('  // ============================================');
console.log('  // BARBURRITO - UK Mexican Chain');
console.log('  // ============================================');

barburrito.forEach(r => {
  const city = fixCity(r.address.city, r.name);
  const shortName = r.name.replace('Barburrito - ', '');
  const escapedName = r.name.replace(/'/g, "\\'");
  const escapedStreet = (r.address.street || '').replace(/'/g, "\\'");

  console.log(`  {
    id: '${createId('barburrito', shortName)}',
    chainId: 'barburrito',
    chainName: 'Barburrito',
    name: '${escapedName}',
    city: '${city}',
    address: '${escapedStreet}',
    postalCode: '${r.address.postal_code || ''}',
    country: 'uk',
    coordinates: { lat: ${r.coordinates.lat}, lng: ${r.coordinates.lng} },
    deliveryPlatforms: [],
    plantedProducts: ['planted.chicken'],
  },`);
});

console.log('');
console.log('  // ============================================');
console.log('  // BREZELKÖNIG - Swiss Pretzel Chain (Full List)');
console.log('  // ============================================');

// Sort by city
uniqueBrezel.sort((a, b) => a.address.city.localeCompare(b.address.city));

uniqueBrezel.forEach((r, i) => {
  let shortName = r.name.replace(/^Brezelkönig\s*/i, '').replace(/^BREZELKÖNIG\s*/i, '');
  if (!shortName) shortName = r.address.city;

  const escapedName = r.name.replace(/'/g, "\\'");
  const escapedStreet = (r.address.street || '').replace(/'/g, "\\'");

  // Add dish info only to first entry
  const dishesStr = i === 0 ? `
    dishes: [
      { name: 'Baguette Planted Chicken Curry', description: 'Pretzel baguette with planted.chicken, Lollo Verde lettuce, and curry sauce', price: 'CHF 8.20', plantedProduct: 'planted.chicken', isVegan: true },
    ],` : '';

  console.log(`  {
    id: '${createId('bk', shortName)}',
    chainId: 'brezelkoenig',
    chainName: 'Brezelkönig',
    name: '${escapedName}',
    city: '${r.address.city}',
    address: '${escapedStreet}',
    country: 'ch',
    coordinates: { lat: ${r.coordinates.lat}, lng: ${r.coordinates.lng} },
    deliveryPlatforms: [],
    plantedProducts: ['planted.chicken'],${dishesStr}
  },`);
});

console.log('\n// Total: ' + barburrito.length + ' Barburrito + ' + uniqueBrezel.length + ' Brezelkönig = ' + (barburrito.length + uniqueBrezel.length) + ' locations');
