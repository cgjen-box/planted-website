# Google Custom Search API Setup for Claude Code

## Overview

We are using Google's **Custom Search JSON API** (Programmable Search Engine) for search functionality in Claude Code.

## Pricing Structure

| Tier | Queries | Cost |
|------|---------|------|
| Free | 100 queries/day per engine | $0 |
| Paid | Up to 10,000 queries/day (account-wide) | $5 per 1,000 queries |

**Important:** The 100 free queries are per search engine. The 10,000 paid limit is per Google Cloud account.

## Our Setup: 6 Search Engines

Chris has configured **6 separate Programmable Search Engines**, which provides:

- **600 free queries per day** (6 engines × 100 free queries each)
- Once free quota is exhausted → switch to paid tier
- Paid tier: up to 10,000 queries/day at $5/1,000 queries

## Cost Calculation

| Daily Usage | Cost |
|-------------|------|
| 0–600 queries | $0 (using 6 free engine quotas) |
| 601–1,600 queries | $5 (1,000 paid queries) |
| 1,601–2,600 queries | $10 (2,000 paid queries) |
| Up to 10,600 queries | $50 max (10,000 paid + 600 free) |

## Implementation Strategy

### Phase 1: Free Tier
1. Rotate through the 6 search engines
2. Track query count per engine per day
3. Switch to next engine when one hits 100 queries
4. Total free capacity: 600 queries/day

### Phase 2: Paid Tier (when free exhausted)
1. Enable billing in Google Cloud API Console
2. Continue using any engine (quota is account-wide now)
3. Set daily quota limits in Cloud Console to control costs

## API Endpoints

**Base URL:** `https://customsearch.googleapis.com/customsearch/v1`

**Required Parameters:**
- `key` - Your API key
- `cx` - Search Engine ID (one of the 6 engines)
- `q` - Search query

**Example Request:**
```
https://customsearch.googleapis.com/customsearch/v1?key=YOUR_API_KEY&cx=ENGINE_ID&q=search+term
```

## Engine Rotation Logic (Pseudocode)

```javascript
const engines = [
  { id: 'cx_engine_1', queriesUsed: 0 },
  { id: 'cx_engine_2', queriesUsed: 0 },
  { id: 'cx_engine_3', queriesUsed: 0 },
  { id: 'cx_engine_4', queriesUsed: 0 },
  { id: 'cx_engine_5', queriesUsed: 0 },
  { id: 'cx_engine_6', queriesUsed: 0 },
];

const FREE_LIMIT_PER_ENGINE = 100;

function getAvailableEngine() {
  // Find engine with remaining free quota
  const freeEngine = engines.find(e => e.queriesUsed < FREE_LIMIT_PER_ENGINE);
  
  if (freeEngine) {
    freeEngine.queriesUsed++;
    return freeEngine.id;
  }
  
  // All free quotas exhausted - use any engine (paid mode)
  // Billing must be enabled at this point
  return engines[0].id;
}

// Reset counts daily at midnight UTC
function resetDailyQuotas() {
  engines.forEach(e => e.queriesUsed = 0);
}
```

## Monitoring & Billing

- **Monitor usage:** [Google Cloud Console API Dashboard](https://console.cloud.google.com/apis/dashboard)
- **Set up billing:** [Google Cloud Billing](https://cloud.google.com/billing/docs/how-to/manage-billing-account)
- **Set quota limits:** Cloud Platform Console → APIs & Services → Quotas

## Important Notes

1. **Free quota resets daily** at midnight Pacific Time (Google's default)
2. **Paid quota is account-wide**, not per-engine
3. **Set spending limits** in Cloud Console to avoid unexpected charges
4. **API key security:** Keep API keys secure, restrict by IP/referrer if possible
5. **Rate limits:** Be mindful of queries-per-second limits (not just daily)

## Links

- [Custom Search JSON API Overview](https://developers.google.com/custom-search/v1/overview)
- [Programmable Search Engine Control Panel](https://programmablesearchengine.google.com/controlpanel/all)
- [API Console](https://console.cloud.google.com/apis)
- [Billing Setup](https://cloud.google.com/billing/docs/how-to/manage-billing-account)

---

*Last updated: December 2024*
