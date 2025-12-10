# Planted Availability Database - Technical Documentation

## Overview

The Planted Availability Database (PAD) is a comprehensive system for managing and discovering locations where Planted products are available. It consists of two main components:

1. **planted-astro** - Public-facing website with store locator
2. **planted-availability-db** - Backend monorepo with database, API, scrapers, and admin dashboard

---

## Part 1: Website Architecture

### 1.1 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Astro | 5.x |
| UI Library | React | 19.x |
| Styling | styled-components | 6.x |
| CMS | Sanity | 4.x |
| Build | Static Site Generation | - |
| Deployment | GitHub Pages | - |

### 1.2 Project Structure

```
planted-astro/
├── src/
│   ├── pages/
│   │   └── [locale]/              # Multi-locale pages
│   │       ├── index.astro        # Homepage
│   │       ├── products/          # Product catalog
│   │       ├── recipes/           # Recipe content
│   │       ├── news.astro         # News/blog
│   │       ├── our-story.astro    # Company pages
│   │       └── ...
│   ├── components/
│   │   ├── StoreLocator.astro     # Main store finder
│   │   ├── NearbyStores.astro     # Location cards
│   │   ├── Navbar.astro           # Navigation
│   │   └── ...
│   ├── data/
│   │   ├── chainRestaurants.ts    # Chain locations
│   │   ├── discoveredLocations.ts # Auto-generated venues
│   │   ├── deliveryRestaurants.ts # Delivery partners
│   │   └── padApi.ts              # PAD API client
│   ├── i18n/
│   │   └── config.ts              # Internationalization
│   └── layouts/
│       └── Layout.astro           # Main layout wrapper
├── public/
│   ├── images/                    # Static images
│   ├── fonts/                     # Custom fonts
│   └── video/                     # Hero video
└── astro.config.mjs               # Astro configuration
```

### 1.3 Internationalization (i18n)

The website supports multiple locales across several countries:

| Country | Locales | Languages |
|---------|---------|-----------|
| Switzerland | `ch-de`, `ch-fr`, `ch-it`, `ch-en` | German, French, Italian, English |
| Germany | `de`, `de-en` | German, English |
| Austria | `at`, `at-en` | German, English |
| Italy | `it`, `it-en` | Italian, English |
| France | `fr`, `fr-en` | French, English |
| Netherlands | `nl`, `nl-en` | Dutch, English |
| United Kingdom | `uk` | English |
| Spain | `es`, `es-en` | Spanish, English |

### 1.4 Store Locator

The store locator is the primary feature for finding Planted products.

**Data Flow:**
```
User enters ZIP code
       ↓
Geocode ZIP to coordinates (city lookup table)
       ↓
Calculate distances (Haversine formula)
       ↓
Filter by venue type (retail/restaurant/delivery)
       ↓
Display sorted results
```

**Data Sources:**
1. `chainRestaurants.ts` - Manually curated chain locations
2. `discoveredLocations.ts` - Auto-generated from PAD discovery system
3. PAD API - Live venue data from Firestore

**Key Features:**
- Distance-based sorting
- Venue type filtering (retail, restaurant, delivery)
- Delivery platform links (Uber Eats, Wolt, Lieferando, etc.)
- Country-specific pricing display

---

## Part 2: Backend Architecture

### 2.1 Monorepo Structure

```
planted-availability-db/
├── packages/
│   ├── core/                      # Shared types & utilities
│   ├── database/                  # Firestore collections
│   ├── api/                       # Cloud Functions
│   ├── scrapers/                  # Discovery agents & CLI tools
│   ├── admin-dashboard/           # React admin UI
│   └── client-sdk/                # JavaScript SDK
├── firebase.json                  # Firebase configuration
├── firestore.indexes.json         # Database indexes
├── turbo.json                     # Turbo build config
├── pnpm-workspace.yaml            # pnpm workspace
└── package.json                   # Root package
```

### 2.2 Package Details

#### @pad/core
Shared TypeScript types and utilities.

**Key Files:**
- `src/types/index.ts` - Base types (Venue, Dish, Product)
- `src/types/discovery.ts` - Discovery system types
- `src/types/dish-discovery.ts` - Dish extraction types

**Exported Types:**
```typescript
// Venue types
export type VenueType = 'retail' | 'restaurant' | 'delivery_kitchen';
export type VenueStatus = 'active' | 'stale' | 'archived';

// Discovery types
export type DiscoveredVenueStatus = 'discovered' | 'verified' | 'rejected' | 'promoted' | 'stale';

// Platform types
export type DeliveryPlatform = 'uber-eats' | 'just-eat' | 'lieferando' | 'wolt' | 'smood';
export type SupportedCountry = 'CH' | 'DE' | 'AT';

// Product SKUs
export const PLANTED_PRODUCT_SKUS = [
  'planted.chicken',
  'planted.chicken_tenders',
  'planted.chicken_burger',
  'planted.kebab',
  'planted.schnitzel',
  'planted.pulled',
  'planted.burger',
  'planted.steak',
  'planted.pastrami',
  'planted.duck'
] as const;

export type PlantedProductSku = (typeof PLANTED_PRODUCT_SKUS)[number];
```

#### @pad/database
Firestore collection definitions and query utilities.

**Collections:**

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `venues` | Production venue data | name, type, address, delivery_platforms |
| `dishes` | Production dish data | venue_id, name, price, planted_products |
| `products` | Planted product catalog | sku, name, description |
| `chains` | Restaurant chain metadata | name, locations_count |
| `promotions` | Active promotions | venue_id, discount, valid_until |
| `partners` | Partner integrations | name, api_config |
| `changelog` | Data change history | entity_type, entity_id, changes |
| `scraper-runs` | Scraper execution logs | scraper_id, status, results |
| `retail-availability` | Retail stock levels | store_id, product_id, in_stock |
| `ingestionBatches` | Batch import tracking | status, records_count |
| `discovered_venues` | AI-discovered venues | confidence_score, status |
| `discovered_dishes` | AI-extracted dishes | product_confidence, prices |
| `discovery-strategies` | Search query patterns | success_rate, query_template |
| `discovery-runs` | Discovery execution logs | stats, strategies_used |
| `dish-extraction-strategies` | Menu extraction patterns | extraction_config |
| `dish-extraction-runs` | Extraction execution logs | dishes_extracted |
| `search-feedback` | Discovery feedback | result_type, venue_was_correct |
| `dish-feedback` | Extraction feedback | name_correct, price_correct |

**Staging Collections:**
| Collection | Purpose |
|------------|---------|
| `staged-venues` | Venues pending review |
| `staged-dishes` | Dishes pending review |
| `staged-promotions` | Promotions pending review |
| `staged-availability` | Availability updates pending |

#### @pad/api
Firebase Cloud Functions for API endpoints.

**Public Endpoints (region: europe-west6):**
```
GET  /api/v1/venues                    # List venues with filters
GET  /api/v1/venues/:id                # Single venue details with dishes
GET  /api/v1/nearby?lat=X&lng=Y        # Nearby venue search
GET  /api/v1/dishes                    # Dish search
GET  /api/v1/dishes/:id                # Single dish details
GET  /api/v1/delivery                  # Delivery platform venues
GET  /api/v1/geolocate                 # IP-based geolocation
```

**Admin Endpoints:**
```
GET  /admin/venues              # Admin venue list
POST /admin/venues              # Create venue
PUT  /admin/venues/:id          # Update venue
DELETE /admin/venues/:id        # Delete venue

GET  /admin/flagged             # Stale/flagged items
POST /admin/verify/:id          # Verify item
POST /admin/archive/:id         # Archive item
```

**Scheduled Functions:**
```
scheduledDiscovery     # Daily at 3 AM - Run discovery agent
weeklyVerification     # Sundays at 4 AM - Re-verify venues
```

#### @pad/scrapers
AI-powered discovery and extraction agents.

**Key Components:**

1. **SmartDiscoveryAgent**
   - Location: `src/agents/smart-discovery/SmartDiscoveryAgent.ts`
   - Purpose: Find new Planted restaurant partners via web search
   - Uses: Gemini/Claude AI for reasoning, Google Custom Search API

2. **SmartDishFinderAgent**
   - Location: `src/agents/smart-dish-finder/index.ts`
   - Purpose: Extract menu items from delivery platform pages
   - Uses: Gemini AI for extraction, Puppeteer for page fetching

3. **SearchEnginePool**
   - Location: `src/agents/smart-discovery/SearchEnginePool.ts`
   - Purpose: Manage multiple search engine IDs for quota optimization
   - Provides: 600 free queries/day (6 engines x 100 each)

**CLI Tools:**
```bash
# Run venue discovery
pnpm run discovery --countries DE --platforms uber-eats

# Run dish extraction
pnpm run dish-finder --chains dean-david --mode enrich

# Interactive venue review
pnpm run review --batch 10 --country CH

# Interactive dish review
pnpm run review-dishes --batch 10 --chain dean-david

# Search pool management
pnpm run search-pool stats
```

#### @pad/admin-dashboard (Legacy v1)
React-based admin interface (original version).

**Technology Stack:**
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 18.3.1 |
| Routing | React Router | 7.0.1 |
| State | TanStack Query | 5.60.0 |
| Build | Vite | 6.0.1 |
| Auth | Firebase Auth | - |

**Pages:**
| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Overview stats and metrics |
| Venues | `/venues` | Venue management (CRUD) |
| Dishes | `/dishes` | Dish management (CRUD) |
| Scrapers | `/scrapers` | Scraper monitoring |
| Promotions | `/promotions` | Promotion management |
| Moderation | `/moderation` | Flagged item review |
| Partners | `/partners` | Partner management |
| Discovery Review | `/discovery-review` | Review AI-discovered venues |
| Budget | `/budget` | Budget and cost monitoring |
| Analytics | `/analytics` | Analytics dashboard |
| Import | `/import` | Batch data import |
| Login | `/login` | Authentication |

#### @pad/admin-dashboard-v2 (New)
Modern workflow-focused admin dashboard with enhanced stability and features.

**Technology Stack:**
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React | 18.x |
| Routing | React Router | 7.x |
| State | TanStack Query + Zustand | 5.x |
| Build | Vite | 6.x |
| Auth | Firebase Auth | 11.x |
| UI Components | Shadcn/UI + Radix UI | Latest |
| Styling | Tailwind CSS | 3.x |

**Key Features:**
- **Workflow-First Design**: Clear pipeline from scraping → extraction → review → sync
- **Error Boundary System**: Global error handling with recovery UI
- **API Client with Retry Logic**: Automatic retries with exponential backoff
- **Offline Detection**: Connection status awareness
- **Type-Safe**: Full TypeScript with strict mode

**Project Structure:**
```
packages/admin-dashboard-v2/
├── src/
│   ├── app/                    # App-level components
│   │   ├── providers/          # Context providers (Auth, Query)
│   │   ├── routes/             # Route configuration
│   │   └── App.tsx             # Root component
│   ├── features/               # Feature modules (self-contained)
│   │   ├── scraping/           # Scraper control & monitoring
│   │   │   ├── components/     # ScraperCard, ScraperProgress, BudgetStatus
│   │   │   └── hooks/          # useScrapers, useScraperRun, useBudget
│   │   ├── review/             # Review workflow
│   │   │   ├── components/     # VenueDetailPanel, DishGrid, ApprovalButtons
│   │   │   └── hooks/          # useReviewQueue, useApproval, useFeedback
│   │   ├── browser/            # Data browsing
│   │   │   ├── components/     # HierarchyTree, VenueTable, FilterBar
│   │   │   └── hooks/          # useVenueBrowser, useFilters
│   │   ├── sync/               # Website sync
│   │   └── analytics/          # KPI & cost monitoring
│   ├── lib/                    # Core libraries
│   │   ├── api/                # API client with retries
│   │   ├── firebase.ts         # Firebase configuration
│   │   └── utils.ts            # Utility functions
│   ├── pages/                  # Page components
│   │   ├── workflow/           # Workflow section pages
│   │   └── browser/            # Browser section pages
│   ├── shared/                 # Shared components
│   │   ├── components/         # Layout, ErrorBoundary, LoadingState
│   │   ├── hooks/              # Shared hooks
│   │   └── ui/                 # UI components (Button, Card, Dialog)
│   └── types/                  # Global types
└── package.json
```

**Navigation Sections:**

| Section | Pages | Description |
|---------|-------|-------------|
| **Workflow** | Dashboard, Scrape Control, Review Queue, Sync to Website | Main operational workflow |
| **Browser** | Venue Browser, Live on Website | Data exploration |
| **Operations** | Cost Monitor | System monitoring |

**Pages (v2):**
| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Workflow overview with pipeline status |
| Scrape Control | `/scrape-control` | Trigger and monitor scraping operations |
| Review Queue | `/review-queue` | Review and approve discovered venues |
| Sync to Website | `/sync` | Push approved data to production website |
| Venue Browser | `/venues` | Browse all venue data |
| Live on Website | `/live-venues` | View published venues |
| Cost Monitor | `/costs` | Track API costs and budget |
| Login | `/login` | Firebase authentication |

**Port Configuration:**
- v1 Dashboard: `http://localhost:5173` (or 5174)
- v2 Dashboard: `http://localhost:5175`

---

## Part 3: Discovery System

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Smart Discovery System                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐               │
│  │ SmartDiscovery   │───▶│  SmartDishFinder │               │
│  │ Agent            │    │  Agent           │               │
│  └────────┬─────────┘    └────────┬─────────┘               │
│           │                       │                          │
│           ▼                       ▼                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              AI Integration (Gemini/Claude)           │   │
│  │  • Query generation    • Menu extraction             │   │
│  │  • Result parsing      • Product matching            │   │
│  │  • Chain detection     • Confidence scoring          │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                Firestore Database                     │   │
│  │  • discovery-strategies   • discovered_venues        │   │
│  │  • discovery-runs         • discovered_dishes        │   │
│  │  • search-feedback        • dish-feedback            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Venue Discovery Workflow

```
1. Initialize Discovery Run
   └─ Create discovery-runs record with status: 'pending'

2. For each platform/country combination:
   ├─ Get active strategies (success_rate >= 30%)
   ├─ Execute strategy with city variable substitution
   │   └─ Query: "site:ubereats.com planted chicken {city}"
   ├─ Web Search (Google Custom Search API)
   ├─ AI parses results:
   │   └─ Extracts: URL, name, city, chain signals, Planted mentions
   ├─ Filter false positives:
   │   ├─ Brand misuse chains
   │   ├─ Duplicates (by delivery URL)
   │   └─ Already verified venues
   ├─ Calculate confidence score (0-100)
   ├─ Store in discovered_venues (status: 'discovered')
   └─ Record feedback for strategy learning

3. Update strategy metrics based on results

4. Complete run with stats
```

### 3.3 Discovery Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `explore` | Search for new venues across cities | Default mode for broad discovery |
| `enumerate` | Find all locations of specific chains | Targeted chain expansion |
| `verify` | Re-check existing venue URLs | Data freshness maintenance |

### 3.4 Dish Extraction Workflow

```
1. Initialize Extraction Run
   └─ Create dish-extraction-runs record

2. For each venue with delivery platform URLs:
   ├─ Fetch page content (Puppeteer)
   ├─ AI extracts dish data:
   │   ├─ Dish name, description, category
   │   ├─ Price with currency
   │   ├─ Image URL
   │   └─ Planted product guess
   ├─ Match to Planted product SKU
   ├─ Calculate confidence score
   └─ Store in discovered_dishes

3. Update extraction strategy metrics

4. Complete run with stats
```

### 3.5 Confidence Scoring

**Venue Confidence Factors:**
| Factor | Weight | Description |
|--------|--------|-------------|
| Chain Detection | 30-40 | Multiple location indicators |
| Planted Mention | 20-30 | Explicit "Planted" vs generic |
| URL Pattern | 15-20 | Known platform URL structure |
| Strategy Quality | 10-15 | Parent strategy success rate |

**Dish Confidence Factors:**
| Factor | Weight | Description |
|--------|--------|-------------|
| Product Match | 40 | Exact product name match |
| Price Visibility | 20 | Price extracted successfully |
| Description Quality | 20 | Detailed description found |
| Known Chain | 20 | Venue from verified chain |

### 3.6 Reinforcement Learning

The system learns from human feedback:

1. **Strategy Performance Tracking**
   - Track success/failure of each search query
   - Update success_rate after each use
   - Deprecate strategies below 10% success

2. **Strategy Evolution**
   - AI analyzes patterns in successful queries
   - Generates new query variations
   - Creates "evolved" strategies from parents

3. **Feedback Collection**
   - `search-feedback` - Was the venue correct?
   - `dish-feedback` - Was the extraction accurate?

### 3.7 Search Engine Credential Pool

The system uses multiple Google Custom Search Engine IDs with a single API key to maximize free-tier usage.

**Architecture:**
```
┌─────────────────────────────────────────────────────┐
│                SearchEnginePool                      │
├─────────────────────────────────────────────────────┤
│  API Key: Single shared key                         │
│  Search Engines: 6 custom search engine IDs         │
│  Daily Limit: 100 queries/engine (free tier)        │
│  Total Free: 600 queries/day                        │
│  Paid Fallback: $5 per 1,000 queries                │
│  Quota Reset: Midnight UTC                          │
│  Storage: In-memory + Firestore tracking            │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│           Credential Rotation Logic                  │
├─────────────────────────────────────────────────────┤
│  1. Get next engine with remaining free quota       │
│  2. Execute query via Google Custom Search API      │
│  3. On success: increment usage counter             │
│  4. On 429 error: mark exhausted, rotate to next    │
│  5. If all exhausted: switch to paid mode           │
└─────────────────────────────────────────────────────┘
```

**Configuration:**
```bash
# Required: Single API key for all search engines
GOOGLE_SEARCH_API_KEY=AIza...

# Optional: Custom search engine IDs (defaults provided)
GOOGLE_SEARCH_ENGINE_ID_1=abc123...
GOOGLE_SEARCH_ENGINE_ID_2=def456...
# ... up to GOOGLE_SEARCH_ENGINE_ID_6
```

**CLI Tools:**
```bash
pnpm run search-pool stats    # View pool statistics
pnpm run search-pool list     # Detailed per-engine usage
pnpm run search-pool test     # Test credential rotation
```

### 3.8 AI Provider Architecture

The system supports multiple AI providers with auto-detection:

**Smart Discovery & Dish Extraction:**
| Provider | Model | Use Case |
|----------|-------|----------|
| Gemini | gemini-2.5-flash | Default - fast, cost-effective |
| Claude | claude-sonnet-4-20250514 | Alternative - higher reasoning |

**Auto-Detection Priority:**
1. Check `GOOGLE_AI_API_KEY` or `GEMINI_API_KEY` → use Gemini
2. Check `ANTHROPIC_API_KEY` → use Claude
3. No keys → error

**Manual Selection:**
```bash
pnpm run discovery --ai gemini    # Force Gemini
pnpm run discovery --ai claude    # Force Claude
```

### 3.9 Query Deduplication Cache

The system prevents redundant API calls by caching executed queries:

**Cache Rules:**
- Skip if same query executed in last **24 hours** (had results)
- Skip if same query executed in last **7 days** (had 0 results)

**Query Normalization:**
```
"Planted Chicken Berlin" → "berlin chicken planted"
"  BERLIN   chicken  PLANTED  " → "berlin chicken planted"
```
All variations are treated as identical queries.

**Storage:** Firestore collection `query_cache`

**Configuration:**
```bash
ENABLE_QUERY_CACHE=true    # Enable/disable caching
```

---

## Part 4: Data Models

### 4.1 DiscoveredVenue

```typescript
interface DiscoveredVenue {
  id: string;
  discovery_run_id: string;

  // Basic info
  name: string;
  is_chain: boolean;
  chain_id?: string;
  chain_name?: string;
  chain_confidence?: number;

  // Location
  address: {
    street?: string;
    city: string;
    postal_code?: string;
    country: SupportedCountry;
    full_address?: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: 'exact' | 'approximate' | 'city-center';
  };

  // Delivery platforms
  delivery_platforms: {
    platform: DeliveryPlatform;
    url: string;
    venue_id_on_platform?: string;
    active: boolean;
    verified: boolean;
    rating?: number;
    review_count?: number;
  }[];

  // Products & dishes
  planted_products: string[];
  dishes: {
    name: string;
    price?: string;
    currency?: string;
    planted_product: string;
    description?: string;
    confidence: number;
  }[];

  // Confidence
  confidence_score: number;
  confidence_factors: {
    factor: string;
    score: number;
    reason: string;
  }[];

  // Status
  status: 'discovered' | 'verified' | 'rejected' | 'promoted' | 'stale';
  rejection_reason?: string;
  production_venue_id?: string;

  // Discovery metadata
  discovered_by_strategy_id: string;
  discovered_by_query: string;

  // Timestamps
  created_at: Date;
  verified_at?: Date;
  promoted_at?: Date;
}
```

### 4.2 ExtractedDish

```typescript
interface ExtractedDish {
  id: string;
  extraction_run_id: string;

  // Source
  venue_id: string;
  venue_name: string;
  chain_id?: string;
  chain_name?: string;

  // Dish info
  name: string;
  description?: string;
  category?: string;
  image_url?: string;

  // Planted product
  planted_product: PlantedProductSku;
  product_confidence: number;
  product_match_reason: string;

  // Prices
  prices: {
    country: SupportedCountry;
    platform: DeliveryPlatform;
    price: number;
    currency: string;
    formatted: string;
    last_seen: Date;
  }[];
  price_by_country: Partial<Record<SupportedCountry, string>>;

  // Dietary info
  is_vegan: boolean;
  dietary_tags: string[];

  // Confidence
  confidence_score: number;
  confidence_factors: ConfidenceFactor[];

  // Status
  status: 'discovered' | 'verified' | 'rejected' | 'promoted' | 'stale';
  rejection_reason?: string;
  production_dish_id?: string;

  // Metadata
  discovered_by_strategy_id: string;
  source_url: string;

  // Timestamps
  created_at: Date;
  updated_at: Date;
  verified_at?: Date;
  promoted_at?: Date;
}
```

### 4.3 DiscoveryStrategy

```typescript
interface DiscoveryStrategy {
  id: string;

  // Targeting
  platform: DeliveryPlatform;
  country: SupportedCountry;

  // Query template
  query_template: string;  // e.g., "site:{platform} planted chicken {city}"

  // Performance metrics
  success_rate: number;           // 0-100
  total_uses: number;
  successful_discoveries: number;
  false_positives: number;

  // Origin
  origin: 'seed' | 'agent' | 'manual' | 'evolved';
  parent_strategy_id?: string;

  // Tags
  tags: string[];  // e.g., ['chain-discovery', 'city-specific']

  // Status
  deprecated_at?: Date;
  deprecation_reason?: string;

  // Timestamps
  created_at: Date;
  last_used?: Date;
}
```

---

## Part 5: API Reference

### 5.1 Public API

**Base URL:** `https://europe-west6-planted-availability-db.cloudfunctions.net`

#### GET /api/v1/venues
List venues with optional filters.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| country | string | Filter by country code (CH, DE, AT) |
| type | string | Filter by venue type (retail, restaurant, delivery_kitchen) |
| chain_id | string | Filter by chain ID |
| status | string | Filter by status (active, stale, archived) |
| limit | number | Max results (default: 50) |
| offset | number | Pagination offset |

**Response:**
```json
{
  "venues": [...],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "has_more": true
}
```

#### GET /api/v1/venues/:id
Get venue details with dishes and promotions.

**Response:**
```json
{
  "venue": {...},
  "dishes": [...],
  "promotions": [...],
  "is_open": true,
  "next_open": null,
  "today_hours": "11:00 - 22:00",
  "delivery_partners": [...]
}
```

#### GET /api/v1/nearby
Find venues near a location.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| lat | number | Latitude (required) |
| lng | number | Longitude (required) |
| radius_km | number | Search radius in km (default: 5) |
| type | string | Venue type filter (all, retail, restaurant, delivery_kitchen) |
| product_sku | string | Filter by Planted product |
| open_now | boolean | Only show currently open venues |
| limit | number | Max results (default: 20) |

**Response:**
```json
{
  "results": [
    {
      "venue": {..., "distance_km": 1.2},
      "dishes": [...],
      "is_open": true,
      "next_open": null,
      "today_hours": "11:00 - 22:00"
    }
  ],
  "total": 10,
  "has_more": false
}
```

### 5.2 Admin API

Requires Firebase authentication with admin claims.

#### GET /admin/discovered-venues
List discovered venues pending review.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| status | string | Filter by status |
| country | string | Filter by country |
| minConfidence | number | Minimum confidence score |
| limit | number | Max results |

#### POST /admin/discovered-venues/:id/verify
Verify a discovered venue.

**Request Body:**
```json
{
  "updates": {
    "name": "Corrected Name",
    "planted_products": ["planted.chicken"]
  }
}
```

#### POST /admin/discovered-venues/:id/reject
Reject a discovered venue.

**Request Body:**
```json
{
  "reason": "Not a real Planted partner"
}
```

### 5.3 Admin API v2 (Dashboard 2.0)

New endpoints for the Admin Dashboard v2 workflow features.

#### Review Workflow APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/review/queue` | GET | Get hierarchical review queue |
| `/admin/review/venues/:id/approve` | POST | Full venue approval |
| `/admin/review/venues/:id/partial-approve` | POST | Partial approval with feedback |
| `/admin/review/venues/:id/reject` | POST | Reject with reason |
| `/admin/review/bulk/approve` | POST | Bulk approve (max 100) |
| `/admin/review/bulk/reject` | POST | Bulk reject (max 100) |

#### GET /admin/review/queue
Get review queue with hierarchical organization.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| status | string | Filter: discovered, verified, rejected |
| country | string | Filter by country: CH, DE, AT |
| minConfidence | number | Minimum confidence score (0-100) |
| search | string | Search in venue names |
| cursor | string | Pagination cursor |
| limit | number | Max results (default: 50) |

**Response:**
```json
{
  "items": [...],
  "hierarchy": {
    "countries": [
      {
        "code": "CH",
        "name": "Switzerland",
        "count": 12,
        "types": [
          {
            "type": "restaurant",
            "count": 8,
            "chains": [
              { "id": "dean-david", "name": "Dean & David", "count": 4 }
            ]
          }
        ]
      }
    ]
  },
  "stats": {
    "pending": 47,
    "verified": 234,
    "rejected": 23,
    "byCountry": { "CH": 12, "DE": 23, "AT": 12 }
  },
  "pagination": {
    "cursor": "abc123",
    "hasMore": true,
    "total": 47
  }
}
```

#### POST /admin/review/venues/:id/approve
Fully approve a discovered venue.

**Request Body:**
```json
{
  "dishApprovals": [
    { "dishId": "dish-123", "approved": true },
    { "dishId": "dish-456", "approved": false }
  ]
}
```

#### POST /admin/review/venues/:id/partial-approve
Approve venue with corrections and feedback.

**Request Body:**
```json
{
  "feedback": "Price was incorrect, dish missing",
  "feedbackTags": ["wrong_price", "missing_dish"],
  "dishUpdates": [
    {
      "dishId": "dish-123",
      "updates": { "price": 19.90 },
      "approved": true
    }
  ]
}
```

#### POST /admin/review/venues/:id/reject
Reject venue as false positive.

**Request Body:**
```json
{
  "reason": "Not actually serving Planted products",
  "feedbackTags": ["not_planted_partner"]
}
```

#### Feedback & Learning APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/feedback/submit` | POST | Submit AI feedback |
| `/admin/feedback/process` | POST | Process accumulated feedback |

#### POST /admin/feedback/submit
Submit feedback for AI learning.

**Request Body:**
```json
{
  "entityType": "venue",
  "entityId": "venue-123",
  "feedbackType": "partial",
  "feedback": "Price was off by CHF 1",
  "tags": ["wrong_price"],
  "corrections": [
    { "field": "price", "expected": 19.90, "actual": 18.90 }
  ]
}
```

#### Scraper Control APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/scrapers/discovery/start` | POST | Trigger venue discovery |
| `/admin/scrapers/extraction/start` | POST | Trigger dish extraction |
| `/admin/scrapers/runs/:id/stream` | GET | Real-time progress (SSE) |
| `/admin/scrapers/runs/:id/cancel` | POST | Cancel running operation |

#### Budget & Analytics APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/budget/status` | GET | Get current budget status |
| `/admin/analytics/kpis` | GET | Get KPI dashboard data |
| `/admin/analytics/costs` | GET | Get cost breakdown |
| `/admin/analytics/rejections` | GET | Get rejection analysis |

#### Sync APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/sync/preview` | GET | Preview pending changes |
| `/admin/sync/execute` | POST | Execute sync to website |
| `/admin/sync/history` | GET | Get sync history |

---

## Part 6: Deployment

### 6.1 Frontend (planted-astro)

```bash
# Development
cd planted-astro
npm install
npm run dev

# Production build
npm run build
npm run preview  # Preview the production build

# Deploy (GitHub Pages)
git push origin main  # Triggers GitHub Actions
```

### 6.2 Backend (planted-availability-db)

```bash
# Install dependencies
cd planted-availability-db
pnpm install

# Build all packages
pnpm build

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Full deploy
firebase deploy
```

### 6.3 Admin Dashboard (Legacy v1)

```bash
cd packages/admin-dashboard
npm install
npm run dev       # Development at http://localhost:5173
npm run build     # Production build
```

### 6.4 Admin Dashboard v2 (New)

```bash
cd packages/admin-dashboard-v2
pnpm install
pnpm dev          # Development at http://localhost:5175
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm typecheck    # Run TypeScript type checking
```

**Environment Setup:**
1. Copy `.env.example` to `.env`
2. Configure Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_API_URL=http://localhost:3000
   ```

**Port Assignment:**
- v1 Dashboard: Port 5173/5174
- v2 Dashboard: Port 5175 (prevents conflicts)

---

## Part 7: Environment Variables

Create a `.env` file based on `.env.example`:

### Firebase Configuration
```env
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
FIREBASE_PROJECT_ID=planted-availability-db
```

### AI Provider Keys
```env
# Gemini AI (recommended - default provider)
GOOGLE_AI_API_KEY=...              # Primary Gemini key
GOOGLE_AI_MODEL=gemini-2.5-flash   # Model selection

# Claude AI (alternative)
ANTHROPIC_API_KEY=...              # Claude API key (optional)
```

### Web Search Keys
```env
# Google Custom Search (required)
GOOGLE_SEARCH_API_KEY=...              # Single API key for all engines

# Search Engine IDs (optional - defaults provided)
GOOGLE_SEARCH_ENGINE_ID_1=...
GOOGLE_SEARCH_ENGINE_ID_2=...
# ... up to GOOGLE_SEARCH_ENGINE_ID_6
```

### Discovery Settings
```env
MAX_QUERIES_PER_RUN=2000           # Budget per discovery run
ENABLE_QUERY_CACHE=true            # Enable query deduplication
ENABLE_INLINE_DISH_EXTRACTION=true # Extract dishes during discovery
```

### Admin Dashboard
```env
VITE_API_URL=http://localhost:5001/planted-availability-db/us-central1/api
VITE_FIREBASE_AUTH_DOMAIN=planted-availability-db.firebaseapp.com
```

---

## Part 8: Monitoring & Troubleshooting

### 8.1 Common Issues

**"No AI API key found"**
```bash
# Set Gemini key (recommended)
GOOGLE_AI_API_KEY=your-key-here

# Or set Claude key
ANTHROPIC_API_KEY=your-key-here
```

**"No search credentials available"**
```bash
# Ensure search API key is set
GOOGLE_SEARCH_API_KEY=your-key-here
```

**Admin Dashboard Login Issues:**
1. Verify Firebase Auth is configured
2. Check user has admin custom claims:
   ```bash
   firebase auth:setCustomUserClaims <uid> '{"admin": true}'
   ```

**API Errors:**
- Check Firebase functions logs: `firebase functions:log`
- Verify Firestore rules allow access
- Check CORS configuration

### 8.2 Logs

```bash
# View Cloud Functions logs
firebase functions:log --only discovery

# View specific function logs
firebase functions:log --only scheduledDiscovery
```

### 8.3 Metrics

Key metrics to monitor:
- Discovery success rate (target: >70%)
- Extraction accuracy (target: >85%)
- API response time (target: <500ms)
- Stale venue count (should decrease over time)
- Free query quota remaining
- Paid query costs
