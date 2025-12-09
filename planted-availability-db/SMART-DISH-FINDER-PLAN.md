# Smart Dish Finder - Implementation Plan

## Overview

Build an AI-powered dish discovery agent that fetches complete dish information (names, descriptions, prices by country) from delivery platform pages for venues in our database. The system learns from feedback to improve its extraction strategies over time, similar to the Smart Venue Discovery Agent.

## Goals

1. **Enrich existing venues** with complete dish data (name, description, price, planted product)
2. **Track prices by country** for multi-country chains (CH, DE, AT)
3. **Learn from feedback** to improve extraction accuracy
4. **Maintain freshness** with periodic re-verification

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Smart Dish Finder Agent                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SmartDishFinderAgent (Orchestrator)                             │
│  ├── Fetch venue pages from delivery platforms                  │
│  ├── Extract dishes using Claude                                │
│  ├── Match dishes to Planted products                           │
│  ├── Extract prices by country/platform                         │
│  └── Learn from feedback (quality improvement)                  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Firestore Database Collections                         │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ • dish_extraction_strategies → Extraction patterns      │   │
│  │ • dish_extraction_runs       → Execution tracking       │   │
│  │ • discovered_dishes          → Extracted dish data      │   │
│  │ • dish_feedback              → Human feedback loop      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Data Sources                                            │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ • discovered_venues (verified venues from smart finder) │   │
│  │ • chainRestaurants.ts (known chain locations)           │   │
│  │ • venues collection (production venue data)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### 1. `dish_extraction_strategies` Collection

Stores patterns for extracting dish data from different platforms.

```typescript
interface DishExtractionStrategy {
  id: string;

  // Targeting
  platform: DeliveryPlatform;
  chain_id?: string;  // Optional: chain-specific strategy

  // Extraction patterns (CSS selectors, JSON paths, etc.)
  extraction_config: {
    dish_container_selector?: string;
    name_selector?: string;
    description_selector?: string;
    price_selector?: string;
    image_selector?: string;
    category_selector?: string;
  };

  // Performance metrics (reinforcement learning)
  success_rate: number;           // 0-100
  total_uses: number;
  successful_extractions: number;
  failed_extractions: number;

  // Metadata
  origin: 'seed' | 'agent' | 'manual' | 'evolved';
  parent_strategy_id?: string;

  // Timestamps
  created_at: Date;
  last_used?: Date;
  deprecated_at?: Date;
  deprecation_reason?: string;
}
```

### 2. `dish_extraction_runs` Collection

Tracks each extraction session.

```typescript
interface DishExtractionRun {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';

  config: {
    mode: 'enrich' | 'refresh' | 'verify';
    target_venues?: string[];      // Specific venues to process
    target_chains?: string[];      // Process all venues of chain
    platforms?: DeliveryPlatform[];
    countries?: SupportedCountry[];
    max_venues?: number;
  };

  stats: {
    venues_processed: number;
    dishes_extracted: number;
    dishes_updated: number;
    dishes_verified: number;
    prices_found: number;
    errors: number;
  };

  strategies_used: string[];
  errors: ExtractionError[];

  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  triggered_by: 'scheduled' | 'manual' | 'webhook';
}
```

### 3. `discovered_dishes` Collection

Stores extracted dish data before promotion to production.

```typescript
interface DiscoveredDish {
  id: string;
  extraction_run_id: string;

  // Source
  venue_id: string;              // discovered_venues or venues collection
  venue_name: string;
  chain_id?: string;

  // Dish info
  name: string;
  description?: string;
  category?: string;
  image_url?: string;

  // Planted product matching
  planted_product: string;       // e.g., 'planted.chicken'
  product_confidence: number;    // 0-100
  product_match_reason: string;

  // Prices by country AND platform
  prices: {
    country: SupportedCountry;
    platform: DeliveryPlatform;
    price: number;
    currency: string;
    formatted: string;           // e.g., '€12.90' or 'CHF 18.90'
    last_seen: Date;
  }[];

  // Consolidated price by country (for display)
  price_by_country: Partial<Record<SupportedCountry, string>>;

  // Dietary info
  is_vegan: boolean;
  dietary_tags: string[];

  // Confidence scoring
  confidence_score: number;
  confidence_factors: ConfidenceFactor[];

  // Status
  status: 'discovered' | 'verified' | 'rejected' | 'promoted' | 'stale';
  rejection_reason?: string;
  production_dish_id?: string;

  // Tracking
  discovered_by_strategy_id: string;
  source_url: string;

  created_at: Date;
  verified_at?: Date;
  promoted_at?: Date;
}
```

### 4. `dish_feedback` Collection

Human feedback for reinforcement learning.

```typescript
interface DishFeedback {
  id: string;

  // Reference
  discovered_dish_id: string;
  strategy_id: string;

  // Feedback
  result_type: 'correct' | 'wrong_product' | 'wrong_price' | 'not_planted' | 'error';

  feedback_details?: {
    name_correct: boolean;
    description_correct: boolean;
    price_correct: boolean;
    product_correct: boolean;
    notes?: string;
  };

  reviewed_by?: string;
  created_at: Date;
  reviewed_at?: Date;
}
```

## Core Types

Add to `@pad/core/src/types/dish-discovery.ts`:

```typescript
// Dish extraction modes
export type DishExtractionMode = 'enrich' | 'refresh' | 'verify';

// Price entry with source tracking
export interface PriceEntry {
  country: SupportedCountry;
  platform: DeliveryPlatform;
  price: number;
  currency: string;
  formatted: string;
  last_seen: Date;
}

// Claude extraction response
export interface ExtractedDish {
  name: string;
  description?: string;
  category?: string;
  image_url?: string;
  price: string;
  currency: string;
  planted_product_guess: string;
  product_confidence: number;
  is_vegan: boolean;
  dietary_tags: string[];
  reasoning: string;
}

// Platform page content
export interface VenuePage {
  url: string;
  platform: DeliveryPlatform;
  country: SupportedCountry;
  venue_name: string;
  html?: string;
  json_data?: unknown;  // Some platforms have JSON in page
}

// Strategy update from learning
export interface DishStrategyUpdate {
  strategy_id: string;
  action: 'boost' | 'penalize' | 'deprecate' | 'evolve';
  reason: string;
}
```

## SmartDishFinderAgent Implementation

### File: `packages/scrapers/src/agents/smart-dish-finder/SmartDishFinderAgent.ts`

```typescript
export class SmartDishFinderAgent {
  private ai: AIClient;
  private pageFetcher: PageFetcher;
  private config: DishFinderConfig;
  private currentRun: DishExtractionRun | null = null;

  constructor(pageFetcher: PageFetcher, config?: DishFinderConfig) {
    // ...
  }

  // Main entry point
  async runExtraction(config: ExtractionRunConfig): Promise<DishExtractionRun> {
    // 1. Create run record
    // 2. Get venues to process
    // 3. For each venue:
    //    a. Fetch all delivery platform pages
    //    b. Extract dishes using Claude
    //    c. Match to Planted products
    //    d. Store discovered dishes
    // 4. Complete run with stats
  }

  // Enrich mode: Add dishes to venues without dish data
  private async enrichMode(config: ExtractionRunConfig): Promise<void> {
    // Get venues without dishes or with stale dishes
    // Process each venue's delivery platform links
  }

  // Refresh mode: Update prices for existing dishes
  private async refreshMode(config: ExtractionRunConfig): Promise<void> {
    // Get dishes that haven't been verified recently
    // Re-fetch and update prices
  }

  // Verify mode: Check if dishes still exist on platform
  private async verifyMode(config: ExtractionRunConfig): Promise<void> {
    // Verify dishes still available
    // Mark stale ones
  }

  // Core extraction logic
  private async extractDishesFromPage(page: VenuePage): Promise<ExtractedDish[]> {
    // 1. Get extraction strategy for platform
    // 2. Fetch page content
    // 3. Send to Claude for extraction
    // 4. Parse response
    // 5. Match products
  }

  // Product matching
  private matchPlantedProduct(dishName: string, description: string): {
    product: string;
    confidence: number;
    reason: string;
  } {
    // Use known patterns and Claude for ambiguous cases
  }

  // Learning from feedback
  async learn(): Promise<LearnedPattern[]> {
    // Analyze feedback
    // Update strategy success rates
    // Create evolved strategies
  }
}
```

## Claude Prompts

### Dish Extraction Prompt

```typescript
export const DISH_EXTRACTION_PROMPT = `
You are an expert at extracting menu item data from food delivery platform pages.

Your task: Extract ONLY dishes that contain Planted products (brand name "Planted" - NOT generic "plant-based").

Context:
- Platform: {platform}
- Country: {country}
- Venue: {venue_name}
- Known Planted products this venue serves: {known_products}

Page content:
{page_content}

For EACH dish that mentions "Planted" or "planted" (the brand):
1. Extract the dish name exactly as shown
2. Extract the full description
3. Extract the price with currency
4. Identify which Planted product it uses:
   - planted.chicken (most common)
   - planted.kebab
   - planted.schnitzel
   - planted.pulled (pulled pork alternative)
   - planted.burger
   - planted.steak
   - planted.pastrami
   - planted.duck
5. Determine if it's vegan (no dairy/eggs)
6. Extract any dietary tags (gluten-free, etc.)

CRITICAL:
- Only include dishes where "Planted" (the brand) is explicitly mentioned
- Do NOT include dishes that just say "plant-based", "vegan chicken", etc.
- Extract the EXACT price shown (e.g., "€12.90" or "CHF 18.90")

Return JSON:
{
  "dishes": [
    {
      "name": "Tuscany Chicken Salad",
      "description": "Fresh salad with planted.chicken, sun-dried tomatoes...",
      "category": "Salads",
      "price": "12.90",
      "currency": "EUR",
      "planted_product_guess": "planted.chicken",
      "product_confidence": 95,
      "is_vegan": true,
      "dietary_tags": ["gluten-free"],
      "reasoning": "Description explicitly mentions 'planted.chicken'"
    }
  ],
  "page_quality": {
    "menu_found": true,
    "prices_visible": true,
    "descriptions_available": true
  }
}
`;
```

### Product Matching Prompt

```typescript
export const PRODUCT_MATCHING_PROMPT = `
Identify which Planted product is used in this dish.

Dish name: {dish_name}
Description: {description}
Known products at this venue: {venue_products}

Planted product SKUs:
- planted.chicken - default chicken product
- planted.chicken_tenders - breaded chicken strips
- planted.chicken_burger - chicken burger patty
- planted.kebab - döner/kebab meat
- planted.schnitzel - breaded schnitzel
- planted.pulled - pulled pork style
- planted.burger - beef-style burger
- planted.steak - steak cuts
- planted.pastrami - pastrami slices
- planted.duck - duck alternative

Return the most likely product SKU and confidence (0-100).
`;
```

## CLI Interface

### File: `packages/scrapers/src/cli/run-dish-finder.ts`

```bash
# Basic usage
pnpm run dish-finder [options]

# Options:
--mode, -m <mode>        enrich | refresh | verify (default: enrich)
--venues <list>          Specific venue IDs to process
--chains <list>          Process all venues of these chains
--countries, -c <list>   CH,DE,AT (default: all)
--platforms, -p <list>   uber-eats,lieferando,wolt,just-eat,smood
--max-venues <n>         Limit venues to process (default: 50)
--dry-run                Don't save to database
--verbose, -v            Detailed logging

# Examples:
pnpm run dish-finder --mode enrich --chains "dean&david"
pnpm run dish-finder --mode refresh --countries CH --max-venues 20
pnpm run dish-finder --mode verify --platforms uber-eats
```

### Review CLI: `packages/scrapers/src/cli/review-dishes.ts`

```bash
# Interactive dish review
pnpm run review-dishes [options]

# Options:
--batch, -b <n>       Number to review (default: 10)
--chain <id>          Filter by chain
--country <code>      Filter by country

# Interactive commands:
y - Verify dish (correct)
p - Wrong product (enter correct one)
r - Wrong price
n - Not a Planted dish
s - Skip
q - Quit
```

## Implementation Steps

### Phase 1: Core Infrastructure
1. Create `@pad/core/src/types/dish-discovery.ts` with types
2. Create Firestore collections:
   - `dish_extraction_strategies`
   - `dish_extraction_runs`
   - `discovered_dishes`
   - `dish_feedback`
3. Export from `@pad/database`

### Phase 2: Page Fetching
1. Create `PageFetcher` interface and implementations
2. Handle rate limiting per platform
3. Handle authentication/cookies if needed
4. Extract JSON data from page scripts (many platforms embed menu JSON)

### Phase 3: SmartDishFinderAgent
1. Core agent class with modes (enrich/refresh/verify)
2. Claude integration for extraction
3. Product matching logic
4. Confidence scoring

### Phase 4: Prompts & AI Integration
1. Create `dish-finder-prompts.ts`
2. Dish extraction prompt
3. Product matching prompt
4. Learning prompt

### Phase 5: CLI Tools
1. `run-dish-finder.ts` - main CLI
2. `review-dishes.ts` - feedback CLI

### Phase 6: Learning Loop
1. Feedback collection from review
2. Strategy performance tracking
3. Strategy evolution via Claude analysis

### Phase 7: Integration
1. Export discovered dishes to `chainRestaurants.ts`
2. Update website data
3. Scheduled runs via Cloud Functions

## Success Metrics

- **Extraction accuracy**: >85% dishes correctly extracted
- **Product matching**: >90% correct Planted product identification
- **Price accuracy**: >95% prices correctly extracted
- **Learning improvement**: Strategy success rate increases over time

## Known Challenges

1. **Dynamic content**: Some platforms load menus via JavaScript
   - Solution: Use Puppeteer/Playwright for JS rendering

2. **Rate limiting**: Platforms may block rapid requests
   - Solution: Implement delays, rotate user agents

3. **Price formats**: Different currencies and formats
   - Solution: Normalize in extraction, store raw + parsed

4. **Menu changes**: Dishes may be seasonal/temporary
   - Solution: Track availability windows, mark stale

5. **Multi-location pricing**: Same chain, different prices per location
   - Solution: Store price per country, aggregate to price_by_country

## File Structure

```
packages/scrapers/src/agents/smart-dish-finder/
├── SmartDishFinderAgent.ts     # Main agent
├── DishFinderAIClient.ts       # Claude integration
├── prompts.ts                  # All prompts
├── PageFetcher.ts              # Page fetching interface
├── fetchers/
│   ├── BaseFetcher.ts          # Base class
│   ├── UberEatsFetcher.ts      # Uber Eats specific
│   ├── LieferandoFetcher.ts    # Lieferando specific
│   ├── WoltFetcher.ts          # Wolt specific
│   ├── JustEatFetcher.ts       # Just Eat specific
│   └── SmoodFetcher.ts         # Smood specific
└── index.ts                    # Exports

packages/database/src/collections/
├── dish-extraction-strategies.ts
├── dish-extraction-runs.ts
├── discovered-dishes.ts
└── dish-feedback.ts

packages/scrapers/src/cli/
├── run-dish-finder.ts          # Main CLI
└── review-dishes.ts            # Review CLI
```

## Implementation Decisions

Based on requirements:

1. **Page fetching**: Use **Puppeteer headless browser**
   - Handles JavaScript-rendered content
   - More robust for all platforms
   - Can handle dynamic menus

2. **Data sources**: Process **both** discovered_venues AND chainRestaurants.ts
   - Maximum coverage
   - Chain locations have verified delivery links

3. **Image extraction**: **Yes, extract images**
   - Store image URLs for website display
   - Useful for rich UI presentation

4. **Price handling**: Store **one price per country**
   - Pick the most reliable/common price
   - Simpler for display: `priceByCountry: { ch: 'CHF 18.90', de: '€12.90' }`
   - Track source platform for reference
