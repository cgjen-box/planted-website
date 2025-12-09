# Smart Restaurant Finder Agent - Implementation Plan

## Status: Core Implementation Complete ✓

### Implemented:
- [x] Core types in `@pad/core` (`packages/core/src/types/discovery.ts`)
- [x] Firestore collections (`packages/database/src/collections/discovery-*.ts`)
- [x] SmartDiscoveryAgent with Claude integration
- [x] ClaudeClient with prompts for reasoning
- [x] WebSearchProvider (Google, SerpAPI, Mock)
- [x] Cloud Functions (scheduled + manual triggers)
- [x] Learning/feedback system
- [x] Platform adapters (5 platforms: Just Eat, Uber Eats, Lieferando, Wolt, Smood)

### Remaining:
- [ ] Admin UI for reviewing discoveries
- [ ] End-to-end testing

---

# Original Plan

## Overview

A Claude-powered AI agent that discovers Planted restaurant partners through web searches, learns from feedback, and continuously improves its search strategies over time.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Smart Restaurant Finder                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Discovery  │───▶│   Verify &   │───▶│    Learn &   │      │
│  │    Agent     │    │   Extract    │    │    Store     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Memory System                         │  │
│  │  • Search Strategies    • Success Patterns               │  │
│  │  • Platform Knowledge   • Failure Analysis               │  │
│  │  • Query Templates      • Confidence Scores              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Firestore Collections                    │  │
│  │  • discovery_strategies  • discovery_runs                │  │
│  │  • discovered_venues     • search_feedback               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Discovery Agent (`SmartDiscoveryAgent`)

The main agent that orchestrates searches using Claude's reasoning capabilities.

**Location:** `packages/scrapers/src/agents/SmartDiscoveryAgent.ts`

**Capabilities:**
- Generate intelligent search queries based on learned patterns
- Parse and understand search results
- Detect chains vs. single locations
- Extract structured data from unstructured sources
- Self-evaluate and improve strategies

### 2. Memory/Learning System

**New Firestore Collections:**

#### `discovery_strategies`
```typescript
interface DiscoveryStrategy {
  id: string;
  platform: 'uber-eats' | 'just-eat' | 'lieferando' | 'wolt' | 'smood';
  country: string;
  query_template: string;        // e.g., "site:{platform} planted chicken {city}"
  success_rate: number;          // 0-100
  total_uses: number;
  successful_discoveries: number;
  last_used: Date;
  created_at: Date;
  discovered_by: 'seed' | 'agent' | 'manual';
  tags: string[];                // e.g., ['chain-discovery', 'city-specific']
}
```

#### `discovery_runs`
```typescript
interface DiscoveryRun {
  id: string;
  started_at: Date;
  completed_at?: Date;
  status: 'running' | 'completed' | 'failed';
  config: {
    platforms: string[];
    countries: string[];
    mode: 'explore' | 'enumerate' | 'verify';
  };
  stats: {
    queries_executed: number;
    venues_discovered: number;
    venues_verified: number;
    false_positives: number;
    chains_detected: number;
  };
  strategies_used: string[];     // IDs of strategies
  learned_patterns: string[];    // New patterns discovered
}
```

#### `discovered_venues` (extends staging system)
```typescript
interface DiscoveredVenue {
  id: string;
  discovery_run_id: string;
  name: string;
  chain_id?: string;
  address: { city: string; country: string; full?: string };
  coordinates?: { lat: number; lng: number };
  delivery_platforms: {
    platform: string;
    url: string;
    verified: boolean;
    verification_date?: Date;
  }[];
  planted_products: string[];
  dishes: { name: string; price?: string; product: string }[];
  confidence_score: number;      // 0-100
  confidence_factors: {
    factor: string;
    score: number;
    reason: string;
  }[];
  status: 'discovered' | 'verified' | 'rejected' | 'promoted';
  rejection_reason?: string;
  created_at: Date;
  verified_at?: Date;
}
```

#### `search_feedback`
```typescript
interface SearchFeedback {
  id: string;
  query: string;
  platform: string;
  country: string;
  strategy_id: string;
  result_type: 'success' | 'false_positive' | 'no_results' | 'error';
  discovered_venue_id?: string;
  feedback: {
    was_useful: boolean;
    venue_was_correct: boolean;
    products_were_correct: boolean;
    notes?: string;
  };
  created_at: Date;
}
```

### 3. Claude Integration

**Location:** `packages/scrapers/src/agents/claude/`

#### `ClaudeSearchAgent.ts`
```typescript
interface ClaudeSearchAgent {
  // Generate search queries based on context and learned patterns
  generateSearchQueries(context: SearchContext): Promise<SearchQuery[]>;

  // Parse search results and extract structured data
  parseSearchResults(results: RawSearchResult[]): Promise<ParsedResult[]>;

  // Analyze a potential venue for Planted products
  analyzeVenue(venueData: RawVenueData): Promise<VenueAnalysis>;

  // Learn from feedback and update strategies
  incorporateFeedback(feedback: SearchFeedback[]): Promise<StrategyUpdate[]>;

  // Generate reasoning for decisions (for transparency)
  explainDecision(decision: AgentDecision): string;
}
```

#### `prompts/`
```
prompts/
├── search-generation.md     # Generate search queries
├── result-parsing.md        # Parse and structure results
├── venue-analysis.md        # Analyze if venue serves Planted
├── chain-detection.md       # Detect if restaurant is a chain
├── strategy-learning.md     # Learn from feedback
└── confidence-scoring.md    # Score confidence in findings
```

### 4. Platform Adapters

**Location:** `packages/scrapers/src/agents/platforms/`

Each adapter knows how to search and extract data from a specific platform:

```typescript
interface PlatformAdapter {
  platform: string;
  searchUrl(query: string): string;
  parseSearchPage(html: string): SearchResult[];
  parseVenuePage(html: string): VenueDetails;
  getDeliveryZones(venueId: string): DeliveryZone[];
}
```

**Adapters:**
- `UberEatsAdapter.ts` - Uber Eats CH/DE/AT
- `JustEatAdapter.ts` - Just Eat (eat.ch)
- `LieferandoAdapter.ts` - Lieferando DE/AT
- `WoltAdapter.ts` - Wolt DE/AT
- `SmoodAdapter.ts` - Smood CH

### 5. Cloud Function Entry Points

**Location:** `packages/api/src/functions/discovery.ts`

```typescript
// Scheduled: Run daily discovery for new restaurants
export const scheduledDiscovery = functions.pubsub
  .schedule('0 3 * * *')  // 3 AM daily
  .onRun(async () => { ... });

// Manual: Trigger discovery for specific platform/country
export const manualDiscovery = functions.https
  .onCall(async (data) => { ... });

// Webhook: Receive feedback on discoveries
export const discoveryFeedback = functions.https
  .onRequest(async (req, res) => { ... });

// Scheduled: Re-verify existing venues weekly
export const weeklyVerification = functions.pubsub
  .schedule('0 4 * * 0')  // 4 AM Sundays
  .onRun(async () => { ... });
```

## Learning Mechanism

### How It Learns

1. **Seed Strategies**: Start with manually crafted search strategies (from existing `IntelligentPlantedDiscoveryAgent`)

2. **Execution Tracking**: Every search query is logged with its results

3. **Feedback Loop**:
   - Human reviews discovered venues (approve/reject)
   - System tracks which strategies led to good vs. bad results
   - Success rates are updated automatically

4. **Strategy Evolution**:
   - Claude analyzes patterns in successful vs. failed queries
   - Generates new query variations to try
   - Deprecated strategies with low success rates
   - Promotes high-performing strategies

5. **Pattern Recognition**:
   - Learns which keywords work best per platform
   - Understands regional naming patterns
   - Detects chain indicators more accurately

### Example Learning Cycle

```
Day 1:
  Query: "site:ubereats.com planted chicken Zürich"
  Result: Found "Hiltl" with planted.chicken dishes
  Feedback: ✓ Correct venue, ✓ Correct products
  → Strategy success_rate: 100%

Day 2:
  Query: "site:ubereats.com planted chicken Basel"
  Result: Found "Vegan Kitchen Basel"
  Feedback: ✗ Restaurant doesn't actually serve Planted
  → Strategy success_rate: 50%
  → Claude analysis: "planted chicken" is too generic,
                     add "planted.chicken" or "by planted"

Day 3:
  NEW Query: "site:ubereats.com planted.chicken Basel"
  Result: Found "Klara Basel" with actual planted.chicken
  Feedback: ✓ Correct
  → New strategy created with higher specificity
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Create Firestore collections and types
- [ ] Implement base `SmartDiscoveryAgent` class
- [ ] Set up Claude API integration
- [ ] Create initial prompt templates

### Phase 2: Platform Adapters (Week 2)
- [ ] Implement `JustEatAdapter` (Switzerland)
- [ ] Implement `UberEatsAdapter` (DACH)
- [ ] Implement `LieferandoAdapter` (Germany/Austria)
- [ ] Implement `WoltAdapter` (DACH)
- [ ] Implement `SmoodAdapter` (Switzerland)

### Phase 3: Learning System (Week 3)
- [ ] Implement strategy storage and retrieval
- [ ] Build feedback collection system
- [ ] Create strategy scoring algorithm
- [ ] Implement Claude-based strategy evolution

### Phase 4: Cloud Functions (Week 4)
- [ ] Deploy scheduled discovery function
- [ ] Create manual trigger endpoint
- [ ] Build feedback webhook
- [ ] Set up verification job

### Phase 5: Integration & Testing (Week 5)
- [ ] Connect to existing staging system
- [ ] Build admin UI for review
- [ ] End-to-end testing
- [ ] Documentation

## Files to Create

```
packages/scrapers/src/agents/
├── SmartDiscoveryAgent.ts           # Main agent class
├── claude/
│   ├── ClaudeSearchAgent.ts         # Claude API wrapper
│   ├── prompts/
│   │   ├── search-generation.md
│   │   ├── result-parsing.md
│   │   ├── venue-analysis.md
│   │   ├── chain-detection.md
│   │   └── strategy-learning.md
│   └── index.ts
├── platforms/
│   ├── BasePlatformAdapter.ts
│   ├── JustEatAdapter.ts
│   ├── UberEatsAdapter.ts
│   ├── LieferandoAdapter.ts
│   ├── WoltAdapter.ts
│   ├── SmoodAdapter.ts
│   └── index.ts
├── memory/
│   ├── StrategyStore.ts
│   ├── FeedbackStore.ts
│   ├── LearningEngine.ts
│   └── index.ts
└── index.ts

packages/core/src/types/
├── discovery.ts                     # New types for discovery system

packages/api/src/functions/
├── discovery.ts                     # Cloud function entry points
```

## Configuration

```typescript
// packages/scrapers/src/config/discovery-config.ts
export const DISCOVERY_CONFIG = {
  claude: {
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
    temperature: 0.3,  // Lower for more consistent outputs
  },
  search: {
    maxQueriesPerRun: 50,
    maxResultsPerQuery: 20,
    rateLimitMs: 2000,
  },
  learning: {
    minFeedbackForLearning: 10,
    strategyExpiryDays: 30,
    lowSuccessThreshold: 0.3,
    highSuccessThreshold: 0.7,
  },
  platforms: {
    'uber-eats': { enabled: true, countries: ['CH', 'DE', 'AT'] },
    'just-eat': { enabled: true, countries: ['CH'] },
    'lieferando': { enabled: true, countries: ['DE', 'AT'] },
    'wolt': { enabled: true, countries: ['DE', 'AT'] },
    'smood': { enabled: true, countries: ['CH'] },
  },
};
```

## Success Metrics

1. **Discovery Rate**: New venues found per week
2. **Precision**: % of discoveries that are actually correct
3. **Strategy Improvement**: Success rate trend over time
4. **Coverage**: % of known chains fully enumerated
5. **Freshness**: Average age of venue verification

## Next Steps

After approval, I'll begin implementing Phase 1:
1. Create the core types in `packages/core/src/types/discovery.ts`
2. Set up the Firestore collections
3. Implement the base `SmartDiscoveryAgent` class
4. Create the Claude integration with initial prompts
