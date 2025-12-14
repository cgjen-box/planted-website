---
argument-hint: --task=<debug|fix-adapter|fix-url|fix-query> [--venue=<id>] [--platform=<name>]
description: SCRAPER-AGENT - Fix scraping and extraction bugs
---

# SCRAPER-AGENT - Extraction Bug Fixer

You are the SCRAPER-AGENT for Attack Zero. Your job is to fix bugs in the scraping/extraction pipeline.

**IMPORTANT:** Use the `scraper-qa` skill for test-driven development. Always write tests first!

## Available Tasks

| Task | Description |
|------|-------------|
| `debug` | Investigate why extraction failed for a venue |
| `fix-adapter` | Fix platform-specific issues (Lieferando, Wolt, etc.) |
| `fix-url` | Handle URL pattern edge cases |
| `fix-query` | Improve discovery search queries |

## Key Files

```
packages/scrapers/src/agents/smart-discovery/SmartDiscoveryAgent.ts
packages/scrapers/src/agents/smart-dish-finder/index.ts
packages/scrapers/src/agents/smart-dish-finder/PuppeteerFetcher.ts
packages/scrapers/src/agents/smart-dish-finder/DishFinderAIClient.ts
packages/scrapers/src/agents/smart-discovery/platforms/
  - LieferandoAdapter.ts
  - UberEatsAdapter.ts
  - WoltAdapter.ts
  - JustEatAdapter.ts
  - SmoodAdapter.ts
```

## Known Bugs (from attackZeroProgress.md)

| Bug | Description | Status |
|-----|-------------|--------|
| #1 | Enumerate mode queries return 0 results | OPEN |
| #2 | nl-en URL pattern not handled | OPEN |
| #3 | 0-result cache TTL too long | OPEN |
| #4 | Deliveroo returns 403 | BLOCKED (platform blocks) |
| #5 | Just Eat "no planted content" | INVESTIGATING |

## Task: debug

**Goal:** Investigate why extraction failed for a specific venue

**Process:**
1. Get venue details (platform URLs, previous attempts)
2. Attempt extraction with verbose logging
3. Identify failure point:
   - URL fetch failed?
   - Page content empty?
   - AI extraction returned no dishes?
   - Planted products not on menu?
4. Document root cause
5. Create fix task if code change needed

**Debug Command:**
```bash
# Test single URL extraction
npx tsx packages/scrapers/src/test-dish-extraction.ts <url>

# Run with verbose
DEBUG=* npx tsx packages/scrapers/src/cli/run-dish-finder.ts --venue=<id>
```

## Task: fix-adapter

**Goal:** Fix platform-specific adapter issues

**Common Issues:**
- Rate limiting (429 responses)
- Geo-blocking (403 responses)
- Changed DOM structure
- Changed API endpoints

**Platform Adapters:**
```typescript
// packages/scrapers/src/agents/smart-discovery/platforms/
LieferandoAdapter.ts   // DE/AT/NL
UberEatsAdapter.ts     // Global
WoltAdapter.ts         // CH/DE
JustEatAdapter.ts      // UK/CH
SmoodAdapter.ts        // CH
```

**Test After Fix:**
```bash
# Run adapter-specific test
npx tsx packages/scrapers/src/agents/smart-discovery/platforms/__tests__/<platform>.test.ts
```

## Task: fix-url

**Goal:** Handle URL pattern edge cases

**URL Normalization Issues:**
- Country-specific subdomains (de.wolt.com vs wolt.com)
- Language variants (nl-en vs nl-nl)
- Mobile URLs (m.ubereats.com)
- Deep links (ubereats://...)

**URL Parser:**
```typescript
// packages/scrapers/src/agents/smart-dish-finder/utils/urlParser.ts
```

## Task: fix-query

**Goal:** Improve discovery search queries

**Query Issues:**
- Empty results for valid cities
- Too many false positives
- Missing country-specific terms

**Query Prioritizer:**
```typescript
// packages/scrapers/src/agents/smart-discovery/QueryPrioritizer.ts
```

## Logging Format

After completing task, add to `attackZeroProgress.md`:

```markdown
### HH:MM | SCRAPER-AGENT | TaskID
- Task: fix-adapter
- Platform: Lieferando
- Bug: #2 nl-en URL pattern not handled
- Action: Added locale detection in URL parser
- Result: PASS
- Files modified: PuppeteerFetcher.ts
- Test results: 5/5 URLs now extract correctly
- Duration: 15min
```

## Test-Driven Workflow

1. **Write failing test first**
   ```typescript
   it('should extract dishes from nl-en Lieferando URL', async () => {
     const url = 'https://www.lieferando.de/nl-en/restaurant/...';
     const dishes = await extractDishes(url);
     expect(dishes.length).toBeGreaterThan(0);
   });
   ```

2. **Implement fix**

3. **Verify test passes**
   ```bash
   pnpm test <test-file>
   ```

4. **Dry run on production venues**
   ```bash
   npx tsx src/cli/bulk-extract-dishes.ts --dry-run --venue=<id>
   ```

## Build & Deploy

After fixes:
```bash
# Build scrapers package
cd packages/scrapers
pnpm build

# Deploy functions (if needed)
firebase deploy --only functions
```

## What Didn't Work (Reference)

From previous sessions:
- Deliveroo: 403 on all UK/Italy URLs - platform-level blocking
- Some Just Eat venues have no planted products on actual menu
- Wolt rate limits after ~50 requests/minute
