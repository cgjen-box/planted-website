# Planted Retailer & Restaurant Link Strategy

## Executive Summary

This document outlines the strategy for enhancing the Planted website's retailer and restaurant discovery features. The goal is to provide users with direct links to Planted products in retail stores and enable food ordering from partner restaurants.

---

## Part 1: Retailer Product Page Links

### Current State
Retailer links currently point to general retailer homepages (e.g., `https://www.coop.ch`), which requires users to manually search for Planted products.

### Target State
All retailer links should point directly to Planted product listings where available.

### Verified Product URLs by Country

#### Switzerland (CH)
| Retailer | Current URL | Proposed URL | Status |
|----------|-------------|--------------|--------|
| Coop | https://www.coop.ch | https://www.coop.ch/en/brands/planted/ | ✅ Verified |
| Migros | https://www.migros.ch | https://www.migros.ch/en/brand/planted | ✅ Verified |

#### Germany (DE)
| Retailer | Current URL | Proposed URL | Status |
|----------|-------------|--------------|--------|
| REWE | https://www.rewe.de | https://shop.rewe.de/productList?brand=planted. | ✅ Verified |
| EDEKA | https://www.edeka.de | https://www.edeka.de (search: planted) | ⚠️ No dedicated brand page |

#### Austria (AT)
| Retailer | Current URL | Proposed URL | Status |
|----------|-------------|--------------|--------|
| BILLA | https://www.billa.at | https://shop.billa.at/suche?q=planted | ⚠️ Search results only |
| BILLA PLUS | https://www.billa.at | https://shop.billa.at/suche?q=planted | ⚠️ Search results only |
| Interspar | https://www.interspar.at | https://www.interspar.at/search/?q=planted | ⚠️ Search results only |
| Eurospar | https://www.eurospar.at | https://www.eurospar.at (limited online) | ⚠️ Limited online presence |
| MPREIS | https://www.mpreis.at | https://shop.mpreis.at/search?q=planted | ⚠️ Search results only |

#### Netherlands (NL)
| Retailer | Current URL | Proposed URL | Status |
|----------|-------------|--------------|--------|
| Albert Heijn | https://www.ah.nl | https://www.ah.nl/producten/merk/planted | ✅ Verified |
| Jumbo | https://www.jumbo.com | https://www.jumbo.com/producten/merk/planted | ⚠️ Needs verification |

#### United Kingdom (UK)
| Retailer | Current URL | Proposed URL | Status |
|----------|-------------|--------------|--------|
| Tesco | https://www.tesco.com | https://www.tesco.com/groceries/en-GB/search?query=planted | ⚠️ Search only |
| Sainsbury's | https://www.sainsburys.co.uk | https://www.sainsburys.co.uk/gol-ui/SearchDisplayView?searchTerm=planted | ⚠️ Search only |

#### France (FR)
| Retailer | Current URL | Proposed URL | Status |
|----------|-------------|--------------|--------|
| Carrefour | https://www.carrefour.fr | https://www.carrefour.fr/s?q=planted | ⚠️ Search only |
| Monoprix | https://www.monoprix.fr | https://www.monoprix.fr/search?q=planted | ⚠️ Search only |
| Casino | https://www.casino.fr | https://www.casino.fr (limited online) | ⚠️ Limited online presence |

#### Italy (IT)
| Retailer | Current URL | Proposed URL | Status |
|----------|-------------|--------------|--------|
| Conad | https://www.conad.it | https://www.conad.it (in-store only) | ⚠️ No online shop |
| Esselunga | https://www.esselunga.it | https://www.esselungaacasa.it/search/?text=planted | ⚠️ Search only |
| Carrefour | https://www.carrefour.it | https://www.carrefour.it/s?q=planted | ⚠️ Search only |
| Interspar | https://www.interspar.it | https://www.interspar.it (limited) | ⚠️ Limited online presence |

#### Spain (ES)
| Retailer | Current URL | Proposed URL | Status |
|----------|-------------|--------------|--------|
| Carrefour | https://www.carrefour.es | https://www.carrefour.es/s?q=planted | ⚠️ Search only |
| El Corte Inglés | https://www.elcorteingles.es | https://www.elcorteingles.es/supermercado/buscar/?term=planted | ⚠️ Search only |

### Implementation Priority
1. **Phase 1**: Update verified URLs (Coop, Migros, REWE, Albert Heijn)
2. **Phase 2**: Verify and update search-based URLs
3. **Phase 3**: Contact retailers without brand pages about dedicated Planted sections

---

## Part 2: Restaurant & Food Delivery Discovery Feature

### Vision
Enable users to discover restaurants serving Planted dishes and order through food delivery platforms, all from the Planted website.

### Challenges Identified

#### 1. Food Delivery API Limitations
After extensive research, we found that major food delivery platforms do NOT offer public APIs for searching menus:

| Platform | API Availability | Use Case |
|----------|------------------|----------|
| Uber Eats | Partner-only API | For restaurant owners to manage listings |
| Just Eat (Takeaway) | Partner-only API | Order management for restaurants |
| Deliveroo | Partner-only API | Restaurant management |
| Wolt | No public API | Internal use only |
| Lieferando | No public API | Part of Just Eat network |

**Key Insight**: None of these platforms allow searching menus by ingredient or brand name via API.

#### 2. Menu Monitoring Complexity
Restaurants change menus frequently. Monitoring all partner menus for Planted dishes requires:
- Web scraping (legal/maintenance issues)
- Manual curation (labor intensive)
- Restaurant partnership data (requires Planted partnership team input)

### Proposed Solution Architecture

#### Option A: Curated Restaurant Database (Recommended)

**Description**: Build a manually curated database of verified Planted partner restaurants with known menu items.

**Data Structure**:
```typescript
interface Restaurant {
  id: string;
  name: string;
  country: CountryCode;
  city: string;
  address: string;
  coordinates: { lat: number; lng: number };
  type: 'dine-in' | 'takeaway' | 'both';
  plantedDishes: {
    name: string;
    product: string; // e.g., 'planted.chicken'
    price?: number;
    description?: string;
  }[];
  deliveryPlatforms: {
    platform: 'uber-eats' | 'just-eat' | 'deliveroo' | 'wolt' | 'lieferando';
    url: string; // Direct link to restaurant on platform
  }[];
  verified: boolean;
  lastVerified: string; // ISO date
}
```

**Pros**:
- Full control over quality
- Accurate, verified information
- Direct links to ordering platforms
- Works with existing tech stack

**Cons**:
- Manual maintenance required
- Requires Planted partnership team involvement
- Slower to scale

#### Option B: Third-Party Data Service

**Description**: Use services like Apify, ScrapingBee, or similar to extract menu data.

**Pros**:
- Automated data collection
- Potentially more comprehensive

**Cons**:
- Legal risks (Terms of Service violations)
- Data accuracy issues
- High maintenance (scrapers break frequently)
- Additional costs
- Not recommended for production use

#### Option C: Partnership Integration (Long-term)

**Description**: Work with Planted's B2B team to integrate directly with partner restaurant systems.

**Pros**:
- Most accurate data
- Real-time menu availability
- Deepest integration

**Cons**:
- Long implementation time
- Requires significant business development
- Complex technical integration

### Recommended Approach: Hybrid Model

Implement in phases:

#### Phase 1: Curated MVP (Immediate)
1. Create a Sanity CMS schema for restaurants
2. Manually add top 10-20 partner restaurants per country
3. Include direct links to delivery platform restaurant pages
4. Add city-based filtering
5. Use browser geolocation for "Near Me" feature

#### Phase 2: Semi-Automated (Medium-term)
1. Build an admin interface for Planted team to update restaurant data
2. Set up email alerts to Planted team for monthly verification reminders
3. Add user feedback mechanism ("Is this restaurant still serving Planted?")

#### Phase 3: Partnership Integration (Long-term)
1. Work with Planted B2B team to get automated partner updates
2. Integrate POS data if available
3. Consider white-label ordering integration

---

## Part 3: Technical Implementation Plan

### 3.1 Retailer Link Updates

**File to modify**: `planted-astro/src/i18n/config.ts`

```typescript
// Update the retailers object with new URLs
export const retailers: Record<CountryCode, RetailerInfo[]> = {
  'ch': [
    {
      name: 'Coop',
      logo: 'coop',
      url: 'https://www.coop.ch/en/brands/planted/',
      productUrl: 'https://www.coop.ch/{lang}/brands/planted/', // Template
      type: 'retail'
    },
    {
      name: 'Migros',
      logo: 'migros',
      url: 'https://www.migros.ch/en/brand/planted',
      productUrl: 'https://www.migros.ch/{lang}/brand/planted',
      type: 'retail'
    },
    // ...
  ],
  // ... other countries
};
```

### 3.2 Restaurant Database Schema (Sanity CMS)

Create new schema: `sanity/schemas/restaurant.ts`

```typescript
export default {
  name: 'restaurant',
  title: 'Partner Restaurant',
  type: 'document',
  fields: [
    { name: 'name', type: 'string', title: 'Restaurant Name' },
    { name: 'slug', type: 'slug', options: { source: 'name' } },
    { name: 'country', type: 'string', title: 'Country Code' },
    { name: 'city', type: 'string', title: 'City' },
    { name: 'address', type: 'string', title: 'Full Address' },
    { name: 'coordinates', type: 'geopoint', title: 'Location' },
    { name: 'image', type: 'image', title: 'Restaurant Image' },
    { name: 'logo', type: 'image', title: 'Restaurant Logo' },
    { name: 'description', type: 'text', title: 'Description' },
    {
      name: 'plantedDishes',
      type: 'array',
      title: 'Planted Dishes',
      of: [{
        type: 'object',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'product', type: 'string', description: 'e.g., planted.chicken' },
          { name: 'price', type: 'number' },
          { name: 'description', type: 'text' },
        ]
      }]
    },
    {
      name: 'deliveryLinks',
      type: 'array',
      title: 'Delivery Platform Links',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'platform',
            type: 'string',
            options: {
              list: ['uber-eats', 'just-eat', 'deliveroo', 'wolt', 'lieferando']
            }
          },
          { name: 'url', type: 'url' }
        ]
      }]
    },
    { name: 'website', type: 'url', title: 'Restaurant Website' },
    { name: 'isActive', type: 'boolean', title: 'Currently Active' },
    { name: 'lastVerified', type: 'date', title: 'Last Verified Date' },
  ],
  orderings: [
    { title: 'By City', name: 'cityAsc', by: [{ field: 'city', direction: 'asc' }] },
  ],
};
```

### 3.3 Frontend Components

#### Restaurant Finder Component

```typescript
// src/components/RestaurantFinder.astro
// Features:
// - City detection via browser geolocation (reverse geocoding)
// - Country-based filtering
// - Show restaurant cards with Planted dishes
// - Direct links to delivery platforms
// - "Dine-in" vs "Delivery" toggle
```

#### City Detection Flow

```typescript
// 1. User clicks "Find Restaurants"
// 2. Request browser geolocation permission
// 3. Get coordinates
// 4. Reverse geocode to city name (OpenStreetMap Nominatim API - free)
// 5. Query restaurants by city
// 6. Display results sorted by distance
```

### 3.4 Data Maintenance Strategy

#### Monthly Verification Process
1. Sanity CMS tracks `lastVerified` date for each restaurant
2. Scheduled GitHub Action runs monthly
3. Creates issues for restaurants not verified in 60+ days
4. Planted team manually verifies and updates

#### User Feedback Integration
- Add "Report an issue" button on each restaurant card
- Options: "Closed", "Not serving Planted", "Wrong address", "Other"
- Submissions go to Sanity CMS for review

---

## Part 4: Implementation Roadmap

### Week 1-2: Retailer Updates
- [ ] Update all retailer URLs with direct product pages
- [ ] Verify all URLs are working
- [ ] Add language-specific URL handling where needed
- [ ] Test on all country variants

### Week 3-4: Restaurant Database Setup
- [ ] Create Sanity CMS restaurant schema
- [ ] Build restaurant data entry interface
- [ ] Add 5-10 pilot restaurants (CH, DE)
- [ ] Create restaurant finder component

### Week 5-6: City Detection & Delivery Links
- [ ] Implement browser geolocation
- [ ] Integrate reverse geocoding
- [ ] Add delivery platform links
- [ ] Build restaurant cards UI

### Week 7-8: Testing & Launch
- [ ] QA all features
- [ ] Add remaining partner restaurants
- [ ] Deploy to production
- [ ] Monitor and iterate

---

## Part 5: Maintenance Calendar

### Weekly Tasks
- Monitor user feedback submissions
- Check for broken retailer links

### Monthly Tasks
- Review restaurants not verified in 60+ days
- Update delivery platform URLs
- Add new partner restaurants

### Quarterly Tasks
- Full retailer URL audit
- Restaurant database cleanup
- Analytics review (which features are most used)

---

## Appendix: Known Partner Restaurants

Based on the existing foodservice partners shown on the website, restaurants to include:

### Switzerland
- **Hiltl** (Zurich) - World's oldest vegetarian restaurant
- **NENI** (Multiple locations)
- Additional: Need input from Planted B2B team

### Germany
- **Tim Raue Restaurant** (Berlin) - Michelin 2-star
- Additional: Need input from Planted B2B team

### Other Countries
- Require input from Planted partnership team

---

## Next Steps

1. **Immediate**: Update retailer URLs with verified product pages
2. **This Week**: Create restaurant Sanity schema
3. **Pending Input**: Get list of partner restaurants from Planted B2B team
4. **Decision Needed**: Approve recommended hybrid approach for restaurants

---

*Document created: December 2025*
*Last updated: December 2025*
