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
