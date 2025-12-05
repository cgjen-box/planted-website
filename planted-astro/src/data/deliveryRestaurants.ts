// Restaurants serving Planted products with delivery options
// This data is curated from web research - verified December 2024

export interface DeliveryPlatform {
    name: 'wolt' | 'lieferando' | 'uber-eats' | 'deliveroo' | 'just-eat' | 'own';
    url: string;
    displayName: string;
}

export interface PlantedDish {
    name: string;
    product: string; // e.g., 'planted.chicken', 'planted.kebab'
    description?: string;
    price?: string;
}

export interface DeliveryRestaurant {
    id: string;
    name: string;
    country: 'ch' | 'de' | 'at' | 'nl' | 'uk' | 'fr' | 'it' | 'es';
    city: string;
    type: 'restaurant' | 'chain';
    plantedDishes: PlantedDish[];
    deliveryPlatforms: DeliveryPlatform[];
    rating?: number;
    verified: boolean;
    lastVerified: string;
}

export const deliveryRestaurants: DeliveryRestaurant[] = [
    // ============================================
    // GERMANY
    // ============================================
    {
        id: 'doen-doen-berlin',
        name: 'doen doen - planted kebap',
        country: 'de',
        city: 'Berlin',
        type: 'restaurant',
        plantedDishes: [
            {
                name: 'Planted Kebap Döner',
                product: 'planted.kebab',
                description: 'Vegan kebab with salad, red cabbage, tomatoes, cucumbers, grilled vegetables, and sauces',
            },
            {
                name: 'Planted Kebap Dürüm',
                product: 'planted.kebab',
                description: 'Wrap version with planted.kebab',
            },
        ],
        deliveryPlatforms: [
            {
                name: 'wolt',
                url: 'https://wolt.com/en/deu/berlin/restaurant/doen-doen-planted-kebap-berlin',
                displayName: 'Wolt',
            },
        ],
        rating: 9.2,
        verified: true,
        lastVerified: '2024-12-05',
    },
    {
        id: 'doen-doen-stuttgart',
        name: 'doen doen - planted kebap',
        country: 'de',
        city: 'Stuttgart',
        type: 'restaurant',
        plantedDishes: [
            {
                name: 'Planted Kebap Döner',
                product: 'planted.kebab',
                description: 'Vegan kebab with salad, red cabbage, tomatoes, cucumbers, grilled vegetables',
            },
        ],
        deliveryPlatforms: [
            {
                name: 'wolt',
                url: 'https://wolt.com/en/deu/stuttgart/restaurant/doen-doen-planted-kebap',
                displayName: 'Wolt',
            },
        ],
        rating: 8.6,
        verified: true,
        lastVerified: '2024-12-05',
    },
    {
        id: 'peter-pane-germany',
        name: 'Peter Pane',
        country: 'de',
        city: 'Multiple cities',
        type: 'chain',
        plantedDishes: [
            {
                name: 'Kebab Klaus Burger',
                product: 'planted.kebab',
                description: 'Burger with planted.kebab, microgreens, and lemon thyme sauce',
                price: '€9.90 on Meatless Monday',
            },
        ],
        deliveryPlatforms: [
            {
                name: 'lieferando',
                url: 'https://www.lieferando.de/peter-pane',
                displayName: 'Lieferando',
            },
            {
                name: 'uber-eats',
                url: 'https://www.ubereats.com/de-en/store/peter-pane-burgergrill-&-bar-east-side/eZYUJfP-TsWYlwALitZ3eg',
                displayName: 'Uber Eats',
            },
            {
                name: 'wolt',
                url: 'https://wolt.com/en/deu/berlin/restaurant/peter-pane',
                displayName: 'Wolt',
            },
        ],
        verified: true,
        lastVerified: '2024-12-05',
    },
    {
        id: 'dean-david-germany',
        name: 'dean&david',
        country: 'de',
        city: 'Multiple cities',
        type: 'chain',
        plantedDishes: [
            {
                name: 'Planted Chicken Kebab Bowl',
                product: 'planted.chicken',
                description: 'Jasmine rice, planted.chicken, cherry tomatoes, cucumber, red cabbage, mint dip, pomegranate, harissa sesame',
            },
            {
                name: 'Planted Chicken Caesar Salad',
                product: 'planted.chicken',
                description: 'Planted.chicken, tomatoes, egg, Italian hard cheese, croutons, Caesar dressing',
            },
            {
                name: 'Golden Curry Bowl',
                product: 'planted.chicken',
                description: 'Jasmine rice, planted.chicken, red cabbage, pomegranate, chickpeas, korma sauce',
            },
        ],
        deliveryPlatforms: [
            {
                name: 'lieferando',
                url: 'https://www.lieferando.de/en/dean-and-david',
                displayName: 'Lieferando',
            },
        ],
        verified: true,
        lastVerified: '2024-12-05',
    },
    {
        id: 'hans-im-glueck-germany',
        name: 'Hans im Glück',
        country: 'de',
        city: 'Multiple cities',
        type: 'chain',
        plantedDishes: [
            {
                name: 'The Better Bagel with Planted Pastrami',
                product: 'planted.pastrami',
                description: '100% vegan bagel with Planted Pastrami - exclusive to Hans im Glück',
            },
        ],
        deliveryPlatforms: [
            {
                name: 'lieferando',
                url: 'https://www.lieferando.de/en/hans-im-glueck',
                displayName: 'Lieferando',
            },
            {
                name: 'uber-eats',
                url: 'https://www.ubereats.com/de-en/brand/hans-im-guck',
                displayName: 'Uber Eats',
            },
        ],
        verified: true,
        lastVerified: '2024-12-05',
    },
    {
        id: 'subway-germany',
        name: 'Subway',
        country: 'de',
        city: 'Multiple cities',
        type: 'chain',
        plantedDishes: [
            {
                name: 'Plant-based Chicken Teriyaki Sub',
                product: 'planted.chicken',
                description: 'Vegan soy strips in spicy teriyaki marinade',
            },
        ],
        deliveryPlatforms: [
            {
                name: 'lieferando',
                url: 'https://www.lieferando.de/subway',
                displayName: 'Lieferando',
            },
            {
                name: 'uber-eats',
                url: 'https://www.ubereats.com/de-en/brand-city/berlin-be/subway',
                displayName: 'Uber Eats',
            },
        ],
        verified: true,
        lastVerified: '2024-12-05',
    },

    // ============================================
    // AUSTRIA
    // ============================================
    {
        id: 'vapiano-austria',
        name: 'Vapiano',
        country: 'at',
        city: 'Vienna',
        type: 'chain',
        plantedDishes: [
            {
                name: 'Planted Chicken Orange-Chili Pasta',
                product: 'planted.chicken',
                description: 'Planted Chicken with orange-chili sauce, pak choi, peppers',
                price: '€15.90',
            },
            {
                name: 'Planted Chicken Cream Pasta',
                product: 'planted.chicken',
                description: 'Planted Chicken with onions, vegan cream, mushrooms',
                price: '€15.90',
            },
        ],
        deliveryPlatforms: [
            {
                name: 'wolt',
                url: 'https://wolt.com/en/aut/vienna/brand/vapiano',
                displayName: 'Wolt',
            },
            {
                name: 'lieferando',
                url: 'https://www.lieferando.at/en/vapiano',
                displayName: 'Lieferando',
            },
        ],
        verified: true,
        lastVerified: '2024-12-05',
    },
    {
        id: 'neni-vienna',
        name: 'NENI',
        country: 'at',
        city: 'Vienna',
        type: 'chain',
        plantedDishes: [
            {
                name: 'NENI Hummus with Planted Chicken',
                product: 'planted.chicken',
                description: 'Classic hummus, Planted chicken, Jerusalem spice, amba, onion, yellow pepper, tahina, pita',
            },
        ],
        deliveryPlatforms: [
            {
                name: 'wolt',
                url: 'https://wolt.com/en/aut/vienna/restaurant/neni-am-naschmarkt',
                displayName: 'Wolt',
            },
        ],
        verified: true,
        lastVerified: '2024-12-05',
    },

    // ============================================
    // SWITZERLAND
    // ============================================
    {
        id: 'hiltl-zurich',
        name: 'Hiltl',
        country: 'ch',
        city: 'Zurich',
        type: 'restaurant',
        plantedDishes: [
            {
                name: 'Protein Bowl',
                product: 'planted.chicken',
                description: 'Bowl with planted protein, vegetables, and Hiltl dressing',
            },
            {
                name: 'Hiltl Burger',
                product: 'planted.burger',
                description: 'Plant-based burger patty with brioche bun',
            },
            {
                name: 'Green Thai Curry',
                product: 'planted.chicken',
                description: 'Thai curry with planted protein',
            },
        ],
        deliveryPlatforms: [
            {
                name: 'uber-eats',
                url: 'https://www.ubereats.com/ch-de/store/hiltl/1mD1LSc4WJKCJBQr5CoxCg',
                displayName: 'Uber Eats',
            },
        ],
        verified: true,
        lastVerified: '2024-12-05',
    },

    // ============================================
    // UK
    // ============================================
    {
        id: 'wagamama-uk',
        name: 'Wagamama',
        country: 'uk',
        city: 'Multiple cities',
        type: 'chain',
        plantedDishes: [
            {
                name: 'Vegan Ramen',
                product: 'planted.chicken',
                description: 'Asian-inspired ramen with plant-based protein',
            },
        ],
        deliveryPlatforms: [
            {
                name: 'deliveroo',
                url: 'https://deliveroo.co.uk/brands/wagamama',
                displayName: 'Deliveroo',
            },
            {
                name: 'uber-eats',
                url: 'https://www.ubereats.com/gb/brand/wagamama',
                displayName: 'Uber Eats',
            },
            {
                name: 'just-eat',
                url: 'https://www.just-eat.co.uk/takeaway/brands/wagamama',
                displayName: 'Just Eat',
            },
            {
                name: 'own',
                url: 'https://takeout.wagamama.com/',
                displayName: 'Wagamama.com',
            },
        ],
        verified: true,
        lastVerified: '2024-12-05',
    },
];

// Helper functions
export function getRestaurantsByCountry(country: DeliveryRestaurant['country']): DeliveryRestaurant[] {
    return deliveryRestaurants.filter(r => r.country === country);
}

export function getRestaurantsByCity(city: string): DeliveryRestaurant[] {
    return deliveryRestaurants.filter(r =>
        r.city.toLowerCase() === city.toLowerCase() ||
        r.city === 'Multiple cities'
    );
}

export function getRestaurantsByProduct(product: string): DeliveryRestaurant[] {
    return deliveryRestaurants.filter(r =>
        r.plantedDishes.some(d => d.product === product)
    );
}

// Platform display info
export const deliveryPlatformInfo: Record<DeliveryPlatform['name'], { logo: string; color: string }> = {
    'wolt': { logo: 'wolt', color: '#00C2E8' },
    'lieferando': { logo: 'lieferando', color: '#FF8000' },
    'uber-eats': { logo: 'uber-eats', color: '#06C167' },
    'deliveroo': { logo: 'deliveroo', color: '#00CCBC' },
    'just-eat': { logo: 'just-eat', color: '#FF5A00' },
    'own': { logo: 'restaurant', color: '#333333' },
};
