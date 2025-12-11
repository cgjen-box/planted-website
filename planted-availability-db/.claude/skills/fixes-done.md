# Fixes Done

Log of bugs found and fixed in the Planted Availability Database project.

---

## 2024-12-10: Dish Cross-Contamination Bug (PuppeteerFetcher)

### Problem
Dishes from one venue (Dean & David) were appearing on other venues (Birdie Birdie, beets&roots) during menu extraction.

### Root Cause
The `PuppeteerFetcher` singleton browser instance wasn't clearing cache/cookies/storage between venue extractions. When fetching menus from platforms like Lieferando, the browser would cache JavaScript state (`window.__INITIAL_STATE__`) from one venue and incorrectly serve it to subsequent venue pages.

### Fix Applied
**File:** `packages/scrapers/src/agents/smart-dish-finder/PuppeteerFetcher.ts`

Added browser state clearing before each page fetch using Chrome DevTools Protocol (CDP):

```typescript
cdpClient = await page.createCDPSession();
await cdpClient.send('Network.clearBrowserCache');
await cdpClient.send('Network.clearBrowserCookies');
await cdpClient.send('Storage.clearDataForOrigin', {
  origin: new URL(url).origin,
  storageTypes: 'all',
});
```

Also added proper cleanup in the finally block:
```typescript
if (cdpClient) {
  try {
    await cdpClient.detach();
  } catch {
    // Ignore detach errors
  }
}
```

### Data Cleanup Script
Used to clear wrong dishes from affected venues:

```javascript
const deanDavidDishPatterns = [
  'Tuscany Chicken',
  'California Chicken',
  'Bangkok Chicken',
  'Chicken Caesar',
  'Protein Chicken Bowl',
  'Harvest Chicken',
  'Bangkok Bowl',
];

// Query venues by name prefix (e.g., 'Birdie', 'beets')
// Filter dishes matching Dean & David patterns
// Update venue with empty dishes array
await doc.ref.update({ dishes: [] });
```

### Affected Venues
- 9 Birdie Birdie venues
- 6 beets&roots venues

### Prevention
The fix ensures browser cache is cleared before each venue extraction, preventing JavaScript state from leaking between different venue pages on the same platform.

---

## 2025-12-11: Sync All Fails Silently (Missing Firestore Index)

### Problem
Clicking "Sync All" on the Live Website page (`/live`) showed "Sync completed successfully" but venues remained in "ready for sync" state. The sync appeared to succeed but nothing was actually synced.

### Root Cause
The `adminSyncExecute` function was calling `discoveredDishes.getByStatus('verified')` which internally uses `.orderBy('confidence_score', 'desc')`. This requires a composite Firestore index (status + confidence_score) that didn't exist. The error was caught but not properly surfaced to the frontend.

**Firebase logs revealed:**
```
FAILED_PRECONDITION: The query requires an index
```

### Fix Applied
**File:** `packages/api/src/functions/admin/sync/execute.ts`

Changed from ordered query to unordered query:
```typescript
// Before (requires composite index):
const allVerifiedDishes = await discoveredDishes.getByStatus('verified');

// After (only needs single-field index):
const allVerifiedDishes = await discoveredDishes.getByStatusUnordered('verified');
```

The `getByStatusUnordered()` method only queries by status without ordering, avoiding the composite index requirement.

### Debugging Steps
1. Added console logging to the sync function
2. Deployed to Firebase
3. Checked logs with `firebase functions:log --only adminSyncExecute`
4. Found the index error in logs

### Prevention
- Use `getByStatusUnordered()` for queries where ordering isn't required
- Always check Firebase function logs when operations "succeed" but don't have expected effects
- The preview endpoint already used `getByStatusUnordered()` - execute should match

---

## 2025-12-11: Cross-Country Venue Discovery (Use Detected Country)

### Problem
During scraping runs for specific countries (e.g., Italy), venues from other countries (e.g., Germany) were being discovered via cross-border search results. These venues were being saved with the wrong country code from the run config, instead of the actual country from the URL.

### Root Cause
The `SmartDiscoveryAgent.processDiscoveredVenue()` method was setting the country from the **run configuration** directly, without checking what country the URL actually belongs to.

```typescript
// Before: Country hardcoded from config
address: {
  city: venue.city || 'Unknown',
  country,  // This came from config, not from URL
},
```

### Fix Applied
**Files:**
- `packages/scrapers/src/agents/smart-discovery/country_url_util.ts` (new)
- `packages/scrapers/src/agents/smart-discovery/SmartDiscoveryAgent.ts`

**Key insight:** Don't SKIP venues with country mismatch - USE the detected country instead. This preserves valid Planted venue discoveries while ensuring correct country assignment.

Created a new utility to detect country from URL:

```typescript
// country_url_util.ts
export function getCountryFromUrl(url: string): SupportedCountry | null {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('lieferando.de') || lowerUrl.includes('wolt.com/de') || lowerUrl.includes('ubereats.com/de')) return 'DE';
  if (lowerUrl.includes('justeat.it') || lowerUrl.includes('deliveroo.it') || lowerUrl.includes('ubereats.com/it')) return 'IT';
  // ... all 10 countries covered
  return null;
}
```

Updated `processDiscoveredVenue()` to use detected country:

```typescript
// Detect actual country from URL (more accurate than config)
const urlCountry = getCountryFromUrl(venue.url);
const actualCountry = urlCountry || country;  // Use detected country, fallback to config

if (urlCountry && urlCountry !== country) {
  this.log(`Venue ${venue.name}: Using detected country (${urlCountry}) from URL instead of expected (${country})`);
}

// Use actualCountry in dish extraction and venue creation
dishes = await this.extractDishesForVenue(venue.url, venue.name, platform, actualCountry, ...);

address: {
  city: venue.city || 'Unknown',
  country: actualCountry,
},
```

### Countries Covered
- CH (just-eat.ch, smood.ch, ubereats.com/ch)
- DE (lieferando.de, wolt.com/de, ubereats.com/de)
- AT (lieferando.at, wolt.com/at, ubereats.com/at)
- IT (justeat.it, deliveroo.it, ubereats.com/it, glovoapp.com/it)
- ES (just-eat.es, deliveroo.es, ubereats.com/es, glovoapp.com/es)
- FR (just-eat.fr, deliveroo.fr, ubereats.com/fr)
- UK (just-eat.co.uk, deliveroo.co.uk, ubereats.com/gb)
- NL (thuisbezorgd.nl, deliveroo.nl, ubereats.com/nl)
- BE (takeaway.com/be, deliveroo.be, ubereats.com/be)
- PL (pyszne.pl, wolt.com/pl, ubereats.com/pl, glovoapp.com/pl)

### Benefits
- No valid Planted venues are wasted (cross-border discoveries still saved)
- Venues get correct country from URL (more accurate than config)
- Logging provides visibility into country corrections
- Backwards compatible (falls back to config country if URL unknown)

---

## 2025-12-11: AI Confidence Scoring Hallucination (Template Variable Mismatch)

### Problem
Discovery runs using GeminiClient (the default AI provider) produced completely wrong confidence factors:
- "Jour - Lafayette" in Lyon → confidence_factors said "KFC chain" and "Paris, France" (wrong!)
- "Vapiano (Tower Bridge)" → said "The venue is KFC" (wrong!)
- Many venues labeled as "dean&david" incorrectly
- Countries completely wrong (ES for CH venues, UK for DE venues)

### Root Cause
The `GeminiClient.scoreConfidence()` method passed **wrong variable names** to the prompt template, causing the AI to receive no venue data and hallucinate everything.

**CONFIDENCE_SCORING_PROMPT expects:**
- `{venue_data}` - the venue JSON
- `{verification_history}` - previous verifications

**GeminiClient was passing:**
- `venue` (wrong name!) → Never replaced, AI saw literal `{venue_data}` text
- `verification_history` NOT PASSED AT ALL

The `ClaudeClient` had the correct implementation, but `GeminiClient` (the default provider) had the bug.

### Fix Applied
**File:** `packages/scrapers/src/agents/smart-discovery/GeminiClient.ts`

```typescript
// Before (BROKEN):
const prompt = fillPromptTemplate(CONFIDENCE_SCORING_PROMPT, {
  venue: JSON.stringify(venueData, null, 2),  // WRONG variable name
  query,
  strategy_success_rate: strategySuccessRate.toString(),
  // verification_history missing!
});

// After (FIXED):
const prompt = fillPromptTemplate(CONFIDENCE_SCORING_PROMPT, {
  venue_data: JSON.stringify(venueData, null, 2),  // Correct variable name
  query,
  strategy_success_rate: strategySuccessRate.toString(),
  verification_history: [],  // Added missing variable
});
```

### Affected Data
Discovery run `boNQ3EtwtBj24qjB6ix1` had 88 venues with corrupted confidence_factors. These venues have invalid chain associations and address data in their confidence_factors.

### Prevention
- Always verify that `fillPromptTemplate()` variable names match the template placeholders exactly
- Compare new client implementations against working ones (ClaudeClient was correct)
- Template variable mismatches are silent failures - the AI receives literal `{placeholder}` text and hallucinates

---
