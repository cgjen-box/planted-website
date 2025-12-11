# Scraper Testing Manual

This document defines use cases and test procedures for the backend scraper/discovery/extraction system. Every change must be tested against relevant use cases before being marked complete.

**This is a living document** - Add new use cases as features are developed.

---

## Test Environment Setup

```bash
# Build all packages (required before any test)
cd planted-availability-db && pnpm build

# Run scrapers from correct directory
cd planted-availability-db/packages/scrapers

# Basic dry run (no DB writes)
pnpm run local --dry-run -c ../../scraper-config.json

# Full run with small config
pnpm run local -c ../../scraper-config-test.json
```

## Test Config Templates

### Minimal Test Config (`scraper-config-test.json`)
```json
{
  "mode": "discovery",
  "countries": ["DE"],
  "platforms": ["lieferando"],
  "maxQueries": 5,
  "maxVenues": 3,
  "batchCitySize": 1,
  "extractDishesInline": false
}
```

### Multi-Country Test Config
```json
{
  "mode": "discovery",
  "countries": ["DE", "AT", "IT"],
  "platforms": ["lieferando", "uber-eats"],
  "maxQueries": 3,
  "maxVenues": 2,
  "batchCitySize": 1
}
```

---

# 1. Build & Compilation

## TC-BUILD-001: TypeScript Build Success
**Component:** All packages
**Type:** automated
**Test Command:**
```bash
cd planted-availability-db && pnpm build
```
**Expected Result:** Build completes with 0 errors in scrapers package
**Pass Criteria:** Exit code 0, no TypeScript errors shown

## TC-BUILD-002: Scrapers Package Build
**Component:** packages/scrapers
**Type:** automated
**Test Command:**
```bash
cd planted-availability-db/packages/scrapers && pnpm build
```
**Expected Result:** tsc completes successfully
**Pass Criteria:** No errors, output files generated in dist/

## TC-BUILD-003: Import Resolution
**Component:** All imports
**Type:** automated
**Test Command:**
```bash
cd planted-availability-db && pnpm build 2>&1 | grep -i "cannot find module\|error TS"
```
**Expected Result:** No output (no import errors)
**Pass Criteria:** Empty output, exit code 0 from build

---

# 2. SmartDiscoveryAgent

## 2.1 Initialization & Config

## TC-DISC-001: Agent Initialization
**Component:** SmartDiscoveryAgent
**Type:** dry-run
**Preconditions:** Valid scraper config exists
**Test Command:**
```bash
cd packages/scrapers && pnpm run local --dry-run -c ../../scraper-config-test.json 2>&1 | head -50
```
**Expected Result:** Agent initializes, logs config settings
**Pass Criteria:** Logs show "Starting SmartDiscoveryAgent" or similar

## TC-DISC-002: Config Validation
**Component:** SmartDiscoveryAgent
**Type:** unit
**Test Command:** Run with invalid config (missing required fields)
**Expected Result:** Clear error message about missing config
**Pass Criteria:** Helpful error, not cryptic crash

## 2.2 Country Handling

## TC-DISC-010: Country Detection from URL
**Component:** SmartDiscoveryAgent, country_url_util
**Type:** unit
**Preconditions:** `getCountryFromUrl()` function exists
**Verification Steps:**
1. Check that URLs are correctly mapped to countries
2. German URLs (lieferando.de, wolt.com/de) → DE
3. Italian URLs (justeat.it, deliveroo.it) → IT
**Expected Result:** All 10 countries detected correctly
**Pass Criteria:** Function returns correct SupportedCountry for each URL pattern

## TC-DISC-011: Cross-Border URL Handling
**Component:** SmartDiscoveryAgent.processDiscoveredVenue()
**Type:** integration
**Preconditions:** Run discovery for country A, receive URL from country B
**Verification Steps:**
1. Start discovery run for Italy (IT)
2. If a German URL (lieferando.de) is found
3. Check logs for "Using detected country (DE)"
4. Verify venue saved with country=DE, not IT
**Expected Result:** Venue saved with correct country from URL
**Pass Criteria:** Log shows country correction, Firestore venue has correct country

## TC-DISC-012: Unknown URL Country Fallback
**Component:** SmartDiscoveryAgent.processDiscoveredVenue()
**Type:** unit
**Preconditions:** URL that doesn't match any known pattern
**Verification Steps:**
1. Process venue with unknown URL pattern
2. Check that config country is used as fallback
**Expected Result:** Falls back to config country gracefully
**Pass Criteria:** No error, venue saved with config country

## TC-DISC-013: All 10 Countries Detected
**Component:** country_url_util.ts
**Type:** unit
**Test Cases:**
| URL Pattern | Expected Country |
|-------------|------------------|
| lieferando.de | DE |
| lieferando.at | AT |
| just-eat.ch | CH |
| justeat.it | IT |
| just-eat.es | ES |
| just-eat.fr | FR |
| just-eat.co.uk | UK |
| thuisbezorgd.nl | NL |
| takeaway.com/be | BE |
| pyszne.pl | PL |
**Pass Criteria:** All 10 countries return correctly

## 2.3 Query Execution

## TC-DISC-020: Query Generation
**Component:** SmartDiscoveryAgent
**Type:** dry-run
**Verification Steps:**
1. Run discovery with dry-run
2. Check logs for generated queries
**Expected Result:** Queries include city names, platform keywords
**Pass Criteria:** Sensible search queries logged

## TC-DISC-021: Query Caching
**Component:** QueryCache
**Type:** integration
**Verification Steps:**
1. Run discovery, note queries executed
2. Run same discovery again
3. Check for cache hits
**Expected Result:** Second run uses cached queries, fewer API calls
**Pass Criteria:** Logs show "cache hit" for repeated queries

## TC-DISC-022: Rate Limiting
**Component:** SearchEnginePool
**Type:** integration
**Verification Steps:**
1. Run discovery with many queries
2. Observe timing between requests
**Expected Result:** Requests are rate-limited, no 429 errors
**Pass Criteria:** No rate limit errors, reasonable pacing

## 2.4 Venue Processing

## TC-DISC-030: Venue Discovery
**Component:** SmartDiscoveryAgent
**Type:** live (careful)
**Verification Steps:**
1. Run discovery for known chain (e.g., "Dean & David Berlin")
2. Check discovered venues
**Expected Result:** Venues are found and logged
**Pass Criteria:** At least 1 venue discovered with expected name

## TC-DISC-031: Brand Misuse Detection
**Component:** SmartDiscoveryAgent.isBrandMisuse()
**Type:** unit
**Verification Steps:**
1. Process venue with known misuse name (e.g., "Planted Burger" generic)
2. Check that venue is skipped
**Expected Result:** Brand misuse venues are not saved
**Pass Criteria:** Log shows "Skipping brand misuse venue"

## TC-DISC-032: Chain Detection
**Component:** SmartDiscoveryAgent.getVerifiedChainProducts()
**Type:** unit
**Verification Steps:**
1. Process venue matching known chain (e.g., "Dean & David")
2. Check that chain products are applied
**Expected Result:** Known chain venues get correct products
**Pass Criteria:** Venue has planted_products from chain config

## TC-DISC-033: Duplicate Detection
**Component:** SmartDiscoveryAgent
**Type:** integration
**Verification Steps:**
1. Run discovery twice for same area
2. Check that duplicates are not created
**Expected Result:** Second run doesn't duplicate venues
**Pass Criteria:** Same venue count or "already exists" logs

---

# 3. SmartDishFinderAgent

## 3.1 Page Fetching

## TC-DISH-001: Page Load Success
**Component:** PuppeteerFetcher
**Type:** integration
**Verification Steps:**
1. Fetch a known Lieferando page
2. Check for page content
**Expected Result:** Page HTML retrieved successfully
**Pass Criteria:** Non-empty response, no timeout errors

## TC-DISH-002: Browser Cache Clearing
**Component:** PuppeteerFetcher.fetchPageOnce()
**Type:** integration
**Verification Steps:**
1. Fetch venue A, note dishes
2. Fetch venue B
3. Verify venue B has different dishes
**Expected Result:** Each venue has its own dishes, no cross-contamination
**Pass Criteria:** Venue B doesn't have venue A's dishes

## TC-DISH-003: Page Navigation Errors
**Component:** PuppeteerFetcher
**Type:** unit
**Verification Steps:**
1. Fetch non-existent URL
2. Check error handling
**Expected Result:** Graceful error, not crash
**Pass Criteria:** Error logged, returns null or empty

## 3.2 Data Extraction

## TC-DISH-010: Menu Extraction (Lieferando)
**Component:** SmartDishFinderAgent, LieferandoAdapter
**Type:** integration
**Verification Steps:**
1. Extract dishes from known Lieferando venue
2. Check dish names, prices, descriptions
**Expected Result:** Dishes extracted with correct data
**Pass Criteria:** Multiple dishes with valid names and prices

## TC-DISH-011: Planted Product Detection
**Component:** SmartDishFinderAgent
**Type:** integration
**Verification Steps:**
1. Extract dishes from venue with "Planted" in dish names
2. Check planted_product field
**Expected Result:** Planted products correctly identified
**Pass Criteria:** Dishes have correct planted_product (chicken, kebab, etc.)

## TC-DISH-012: Price Parsing
**Component:** Extraction logic
**Type:** unit
**Test Cases:**
| Input | Expected |
|-------|----------|
| "12,90 €" | "12.90" or 12.90 |
| "CHF 15.50" | "15.50" |
| "$9.99" | "9.99" |
**Pass Criteria:** Prices parsed to numeric format

## TC-DISH-013: Category Extraction
**Component:** Extraction logic
**Type:** integration
**Verification Steps:**
1. Extract dishes with categories
2. Check category field
**Expected Result:** Categories preserved from menu structure
**Pass Criteria:** Dishes have meaningful category values

## 3.3 Cross-Contamination Prevention

## TC-DISH-020: Sequential Venue Extraction
**Component:** SmartDishFinderAgent, PuppeteerFetcher
**Type:** integration
**Verification Steps:**
1. Queue 3 different venues for extraction
2. Extract dishes sequentially
3. Verify each venue has only its own dishes
**Expected Result:** No dish cross-contamination
**Pass Criteria:** Each venue's dishes are unique and correct

## TC-DISH-021: Cache Clear Between Venues
**Component:** PuppeteerFetcher
**Type:** integration
**Verification Steps:**
1. Check logs for CDP cache clearing
2. Verify Network.clearBrowserCache called
**Expected Result:** Cache cleared before each venue
**Pass Criteria:** Logs show cache clearing per venue

---

# 4. Platform Adapters

## TC-PLAT-001: Lieferando URL Pattern
**Component:** Platform adapter
**Type:** unit
**Test URLs:**
- `https://www.lieferando.de/speisekarte/venue-name`
- `https://www.lieferando.de/en/menu/venue-name`
**Expected Result:** URLs correctly parsed and validated
**Pass Criteria:** Platform identified, venue slug extracted

## TC-PLAT-002: UberEats URL Pattern
**Component:** Platform adapter
**Type:** unit
**Test URLs:**
- `https://www.ubereats.com/de/store/venue-name/id`
- `https://www.ubereats.com/ch/store/venue-name/id`
**Expected Result:** URLs correctly parsed, country detected
**Pass Criteria:** Platform identified, country extracted from path

## TC-PLAT-003: Just Eat URL Variations
**Component:** Platform adapter
**Type:** unit
**Test URLs:**
- `https://www.just-eat.ch/...` (Switzerland)
- `https://www.just-eat.co.uk/...` (UK)
- `https://www.thuisbezorgd.nl/...` (Netherlands)
- `https://www.pyszne.pl/...` (Poland)
**Expected Result:** All Just Eat variants recognized
**Pass Criteria:** Platform = just-eat, correct country

---

# 5. Search Engine Integration

## TC-SEARCH-001: Search Pool Initialization
**Component:** SearchEnginePool
**Type:** unit
**Test Command:**
```bash
cd packages/scrapers && pnpm run search-pool
```
**Expected Result:** Pool initializes with available credentials
**Pass Criteria:** Shows available search engines and quota

## TC-SEARCH-002: Query Execution
**Component:** SearchEnginePool
**Type:** integration
**Verification Steps:**
1. Execute search query
2. Check results returned
**Expected Result:** Search returns relevant results
**Pass Criteria:** Non-empty results array

## TC-SEARCH-003: Credential Rotation
**Component:** SearchEnginePool
**Type:** integration
**Verification Steps:**
1. Run many queries
2. Observe credential switching
**Expected Result:** Pool rotates through credentials
**Pass Criteria:** Different credentials used as quota depletes

## TC-SEARCH-004: Error Recovery
**Component:** SearchEnginePool
**Type:** integration
**Verification Steps:**
1. Simulate search failure
2. Check retry behavior
**Expected Result:** Graceful retry or fallback
**Pass Criteria:** No crash, eventual success or clear error

---

# 6. CLI Tools

## TC-CLI-001: Local Runner Help
**Component:** run-local.ts
**Type:** unit
**Test Command:**
```bash
cd packages/scrapers && pnpm run local --help
```
**Expected Result:** Help text displayed
**Pass Criteria:** Shows available options and usage

## TC-CLI-002: Dry Run Flag
**Component:** run-local.ts
**Type:** integration
**Test Command:**
```bash
cd packages/scrapers && pnpm run local --dry-run -c ../../scraper-config-test.json
```
**Expected Result:** Runs without writing to database
**Pass Criteria:** Logs say "dry run", no Firestore writes

## TC-CLI-003: Config File Loading
**Component:** run-local.ts
**Type:** unit
**Verification Steps:**
1. Run with valid config path
2. Run with invalid config path
**Expected Result:** Valid config loads, invalid shows error
**Pass Criteria:** Correct behavior for both cases

---

# 7. Error Handling

## TC-ERR-001: Network Timeout
**Component:** PuppeteerFetcher
**Type:** integration
**Verification Steps:**
1. Fetch very slow page or simulate timeout
2. Check error handling
**Expected Result:** Timeout error caught and logged
**Pass Criteria:** No crash, error logged, continues to next

## TC-ERR-002: Invalid JSON Response
**Component:** Extraction logic
**Type:** unit
**Verification Steps:**
1. Process malformed JSON from page
2. Check recovery
**Expected Result:** Graceful handling of bad data
**Pass Criteria:** Error logged, extraction continues or skips

## TC-ERR-003: API Rate Limit
**Component:** Search/API clients
**Type:** integration
**Verification Steps:**
1. Exceed rate limit
2. Check backoff behavior
**Expected Result:** Backs off and retries
**Pass Criteria:** Eventually succeeds, no crash

## TC-ERR-004: Database Write Failure
**Component:** Firestore operations
**Type:** integration
**Verification Steps:**
1. Simulate DB write failure
2. Check error handling
**Expected Result:** Error logged, run can continue
**Pass Criteria:** Non-fatal, logged appropriately

---

# 8. Data Integrity

## TC-DATA-001: Venue Required Fields
**Component:** Venue creation
**Type:** integration
**Verification Steps:**
1. Create venue via discovery
2. Check all required fields present
**Expected Result:** Venue has: name, url, country, platform, discovery_run_id
**Pass Criteria:** No null required fields

## TC-DATA-002: Dish Required Fields
**Component:** Dish extraction
**Type:** integration
**Verification Steps:**
1. Extract dishes
2. Check required fields
**Expected Result:** Dishes have: name, planted_product, confidence
**Pass Criteria:** All dishes have required fields

## TC-DATA-003: Country Code Format
**Component:** All country handling
**Type:** unit
**Verification Steps:**
1. Check country codes in venues
**Expected Result:** 2-letter ISO codes (DE, AT, CH, etc.)
**Pass Criteria:** All countries are valid SupportedCountry values

## TC-DATA-004: URL Uniqueness
**Component:** Venue deduplication
**Type:** integration
**Verification Steps:**
1. Try to create duplicate venue (same URL)
2. Check handling
**Expected Result:** Duplicate prevented or merged
**Pass Criteria:** No duplicate venues with same URL

---

# Test Execution Checklist

When completing any scraper change, verify:

## Build
- [ ] `pnpm build` succeeds with 0 errors
- [ ] No TypeScript errors in scrapers package
- [ ] No import resolution errors

## Dry Run
- [ ] `--dry-run` flag works
- [ ] No database writes in dry run
- [ ] Logs show expected flow

## Core Functionality
- [ ] Discovery finds venues
- [ ] Country detection works
- [ ] Extraction produces valid dishes
- [ ] No cross-contamination between venues

## Error Handling
- [ ] Graceful failure on bad input
- [ ] No crashes on network errors
- [ ] Logging is informative

---

# Adding New Use Cases

When implementing a new feature, add test cases following this format:

```markdown
## TC-[MODULE]-[NUMBER]: [Test Case Name]
**Component:** [Specific file/function]
**Type:** unit / integration / dry-run / live
**Preconditions:** [Setup required]
**Test Command:** [Exact command or steps]
**Verification Steps:**
1. Step 1
2. Step 2
**Expected Result:** [Specific outcome]
**Pass Criteria:** [How to determine pass/fail]
```

Module prefixes:
- `BUILD` - Compilation/build
- `DISC` - Discovery agent
- `DISH` - Dish finder/extraction
- `PLAT` - Platform adapters
- `SEARCH` - Search engines
- `CLI` - Command line tools
- `ERR` - Error handling
- `DATA` - Data integrity
