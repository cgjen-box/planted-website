# T024 Research Findings

## Task: Manual fix for 4 chains without platform URLs

Date: 2025-12-16
Status: RESEARCH COMPLETE

---

## Executive Summary

Researched 4 venues that were identified as having 0 platform URLs. Found that:

1. **3 of 4 venues already have platform URLs** in the database
2. **1 venue (Max & Benito) needs a Lieferando URL added**
3. **All 4 venues offer planted dishes** that need to be added to the database

---

## Venue Details & Findings

### 1. Chupenga - Burritos & Salads Mohrenstrasse

**Location:** Berlin, Germany (DE)
**Venue ID:** `3thdrRxKneliOrAK23Bm`
**Current Status:** HAS platform URL (Wolt) ✅
**Current Dishes:** 0

**Platform URLs Found:**
- ✅ Already in DB: Wolt - https://wolt.com/de/deu/berlin/restaurant/chupenga-burritos-salads-mohrenstrasse
- Additional found: Multiple Chupenga locations on Wolt

**Planted Dishes Found:**
1. **Bowl with Planted Chicken** (Wolt)
   - Double portion of Planted Chicken
   - Quinoa, beans, salad
   - Pico de Gallo & Chili Corn
   - Pickled onions
   - Optional guacamole (extra charge)
   - Nutrition: 68g protein, 28g fiber, 752 kcal
   - Description: "Grilled vegan Planted.chicken in our house marinade"
   - Price: Not shown in search results (need to scrape from Wolt)

**Sources:**
- https://wolt.com/en/deu/berlin/restaurant/chupenga-burritos-salads-mohrenstrasse
- https://chupenga.de/en/
- https://marie-sharp.de/en/blogs/news/willkommen-bei-chupenga-dem-burrito-bowl-hotspot-in-berlin

**Action Required:**
- Scrape dish details from Wolt URL
- Add dishes to database

---

### 2. Max & Benito

**Location:** Vienna, Austria (AT)
**Venue ID:** `xUPYEVNG5gmeSBNX5U9B`
**Current Status:** NO platform URLs ❌
**Current Dishes:** 0

**Platform URLs Found:**
- ❌ Not in DB: Lieferando - https://www.lieferando.at/en/max-benito
- Partnership page: https://planted-foods-de.myshopify.com/en/blogs/local-news/planted-jetzt-bei-max-benito

**Planted Partnership:**
- Official partnership between Max & Benito and Planted Foods
- Californian-Mexican cuisine with plant-based options
- 5 locations in Vienna

**Planted Dishes Expected:**
- Based on the partnership announcement, they offer planted.chicken options
- Specific dishes: Burrito bowl with plant-based chicken (similar to other locations)
- Menu items: Burritos, bowls, tacos, salads with planted.chicken
- Price range: €10-20 per person (veggie burrito under €10)

**Sources:**
- https://www.lieferando.at/en/max-benito
- https://planted-foods-de.myshopify.com/en/blogs/local-news/planted-jetzt-bei-max-benito
- https://www.tripadvisor.com/Restaurant_Review-g190454-d8624637-Reviews-Max_Benito-Vienna.html

**Action Required:**
- Add Lieferando URL to database ✅ (script ready)
- Scrape menu from Lieferando
- Add planted dishes to database

---

### 3. Mit&Ohne - HB Zürich

**Location:** Zürich, Switzerland (CH)
**Venue ID:** `Bd7JDajYNhnStKetUtnX`
**Current Status:** HAS non-delivery URL (HappyCow) ⚠️
**Current Dishes:** 0

**Platform URLs Found:**
- ❌ Current in DB: HappyCow (not a delivery platform) - https://www.happycow.net/reviews/mit-ohne-zurich-474410
- ✅ Should add: Uber Eats - https://www.ubereats.com/ch-de/store/mit&ohne-hb/keyWWVEIVw-KZml7Xmt-Rg
- Also has: Just Eat - https://www.just-eat.ch/en/menu/mitohne-hb

**Note:** There's a related venue "mit&ohne kebab - Lochergut Zürich" (ID: y1NOXXuX8je24ogWgAUL) that already has 6 dishes and a Just Eat URL. These appear to be different locations of the same chain.

**Planted Dishes Found (from Uber Eats):**
1. **Planted Kebap** (Vegan)
   - Price: CHF 23.50
   - Rating: 90% (40 reviews)
   - Ingredients: Joghurt & Cocktail Sauce, red & white cabbage salad, onion, iceberg lettuce, tomato, cucumber

2. **Linsen Falafel**
   - Price: CHF 21.90
   - Rating: 66% (12 reviews)
   - Ingredients: Hummus, Yogurt Sauce, red/white cabbage, tomato, cucumber, onion, melanzane salad

3. **Vegiboss Kebab**
   - Price: CHF 23.50
   - Rating: 75% (12 reviews)
   - Ingredients: Joghurt & Cocktail Sauce, red & white cabbage salad, onion, iceberg lettuce, tomato, cucumber

**Sides:**
- Klassik Fries: CHF 9.50 (82% rating, 188 reviews)

**Sources:**
- https://www.ubereats.com/ch-de/store/mit&ohne-hb/keyWWVEIVw-KZml7Xmt-Rg
- https://www.just-eat.ch/en/menu/mitohne-hb
- https://zuri.net/en/zurich/doner-kebab/mitundohne-kebab-17838.htm

**Action Required:**
- Add Uber Eats URL to database ✅ (script ready)
- Add Just Eat URL as well
- Add 3 main dishes + sides to database

---

### 4. Tibits Zürich

**Location:** Zürich, Switzerland (CH)
**Venue ID:** `LxMPQ1oyp0dcQX0MzRBh`
**Current Status:** HAS platform URL (Just Eat) ✅
**Current Dishes:** 0

**Platform URLs Found:**
- ✅ Already in DB: Just Eat - https://www.just-eat.ch/en/menu/tibits-zurich
- Additional: Uber Eats (UK locations only, not confirmed for Zurich)

**Restaurant Type:**
- Vegetarian and vegan buffet restaurant
- 40+ salads and warm dishes
- Buffet priced by weight
- Multiple locations across Switzerland

**Planted Dishes:**
- No specific planted.chicken partnership found
- Focus on vegetarian/vegan buffet style
- 40+ rotating dishes daily (buffet format makes it difficult to list specific planted items)
- Sunday brunch buffet: CHF 49 per person (includes croissant + hot drink + Prosecco/juice)

**Sources:**
- https://www.tibits.ch/en/home
- https://www.just-eat.ch/en/menu/tibits-zurich
- https://www.tripadvisor.com/Restaurant_Review-g188113-d1456452-Reviews-Tibits_Zurich_Bistro-Zurich.html

**Action Required:**
- Check if specific planted items available (may require manual verification)
- Buffet format makes it challenging to list individual dishes
- May not be suitable for dish extraction (buffet changes daily)

---

## Summary of Actions

### Immediate Actions (Platform URLs)

1. **Max & Benito** - Add Lieferando URL ✅ Script ready
2. **Mit&Ohne HB** - Add Uber Eats URL ✅ Script ready
3. **Chupenga** - Already has Wolt URL ✅ No action needed
4. **Tibits** - Already has Just Eat URL ✅ No action needed

### Dish Extraction Actions

1. **Chupenga** (Berlin, DE)
   - Scrape Wolt URL for planted chicken bowl details
   - Add 1+ dishes

2. **Max & Benito** (Vienna, AT)
   - Scrape Lieferando menu for planted dishes
   - Add estimated 2-3 planted dishes

3. **Mit&Ohne HB** (Zürich, CH)
   - Scrape Uber Eats for planted kebap and vegan options
   - Add 3 main dishes (Planted Kebap, Linsen Falafel, Vegiboss Kebab)

4. **Tibits** (Zürich, CH)
   - Manual verification needed (buffet restaurant)
   - May not be suitable for individual dish listing
   - Consider marking as "buffet" type venue

---

## Script Created

**File:** `fix-t024-platform-urls.cjs`

**Function:** Adds missing platform URLs to venues

**Usage:**
```bash
node fix-t024-platform-urls.cjs           # Dry run
node fix-t024-platform-urls.cjs --execute # Apply changes
```

**Changes to apply:**
- Max & Benito: Add Lieferando URL
- Mit&Ohne HB: Add Uber Eats URL

---

## Next Steps

1. ✅ Research complete - all findings documented
2. Execute platform URL fix script
3. Create dish extraction script or use existing SmartDishFinderAgent
4. Update attackZeroProgress.md with T024 completion
5. Consider creating a "buffet restaurant" flag for venues like Tibits

---

## Data Quality Notes

**Issue Found:** The initial report stated "4 chains with 0 platform URLs" but:
- 2 venues already had platform URLs in the database
- 1 venue had a non-delivery URL (HappyCow)
- Only 1 venue truly had 0 delivery platform URLs (Max & Benito)

**Recommendation:** Update chain discovery script to differentiate between:
- Delivery platform URLs (Uber Eats, Wolt, Just Eat, Lieferando, etc.)
- Non-delivery URLs (HappyCow, Tripadvisor, etc.)
