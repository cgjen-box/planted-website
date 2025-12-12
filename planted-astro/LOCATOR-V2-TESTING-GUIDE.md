# LocatorV2 - Apple-Style Restaurant Locator Testing Guide

## Overview

This document provides comprehensive testing instructions for the new Apple-style restaurant locator with adaptive display strategy, map integration, carousel view, and smart filtering.

---

## Test Scenarios by Venue Count

### Scenario 1: Simple Grid (1-6 Venues)

**Test Location:** Small city/rural area
- **Example ZIP Codes:**
  - CH: `7000` (Chur - ~3-5 restaurants)
  - DE: `99084` (Erfurt - small selection)

**Expected Behavior:**
✅ Only traditional grid view shown
✅ No filter pills displayed
✅ No map/carousel components
✅ Clean, simple interface
✅ All venues fit on screen without "Show More"

**Test Steps:**
1. Enter small city ZIP code
2. Verify only grid cards appear
3. Verify no filter pills at top
4. Verify no map toggle button
5. Check that all venues display immediately

---

### Scenario 2: Grid + Filters (7-15 Venues)

**Test Location:** Medium city
- **Example ZIP Codes:**
  - CH: `3000` (Bern - ~10-12 restaurants)
  - DE: `50667` (Köln - moderate selection)

**Expected Behavior:**
✅ Traditional grid view shown
✅ Filter pills displayed (All, Vegan, Distance, Rating)
✅ "Show More" button appears after initial 6 venues
✅ No map/carousel yet

**Test Steps:**
1. Enter medium city ZIP code
2. Verify filter pills appear above results
3. Verify initial 6 venues + "Show More" button
4. Click "Show More" → should reveal remaining venues
5. Test filters:
   - Click "🌱 Vegan" → only vegan dishes shown
   - Click "📍 <1km" → only nearby venues shown
   - Click clear (X) → all venues return
6. Verify smooth GSAP animations on filter changes

---

### Scenario 3: Grid + Filters + Map (16-30 Venues)

**Test Location:** Large city with moderate density
- **Example ZIP Codes:**
  - CH: `4000` (Basel - ~20 restaurants)
  - DE: `80331` (München - good selection)

**Expected Behavior:**
✅ Filter pills shown
✅ Map/List toggle button appears
✅ Map view available with markers
✅ Traditional grid still default view
✅ Map pins show venue locations

**Test Steps:**
1. Enter large city ZIP code (16-30 venues)
2. Verify filter pills appear
3. Verify Map/List toggle at top of results
4. Click "🗺️ Map" button:
   - Map loads with all venue pins
   - Pins clustered if close together
   - Click pin → shows venue popup
5. Click "📋 List" button:
   - Returns to traditional grid
   - Maintains filter state
6. Test filters with map:
   - Apply "📍 <500m" filter
   - Map updates to show only nearby pins
   - Pin count matches filtered count
7. Test map interactions:
   - Drag to pan
   - Scroll to zoom
   - Click clustered pins → zooms in and expands

---

### Scenario 4: Map-First + Carousel (31+ Venues)

**Test Location:** Major city with high density
- **Example ZIP Codes:**
  - CH: `8001` (Zürich city center - 40-50 restaurants)
  - DE: `10115` (Berlin Mitte - 44 restaurants)

**Expected Behavior:**
✅ Filter pills shown
✅ Map shown BY DEFAULT
✅ Horizontal carousel below map
✅ Traditional grid hidden unless "Show All" clicked
✅ Map/carousel sync (tap pin → card scrolls into view)

**Test Steps:**
1. Enter major city ZIP code (31+ venues)
2. Verify map loads immediately with all pins
3. Verify carousel appears below map
4. **Test Carousel:**
   - Swipe left/right (mobile/trackpad)
   - Verify snap-to-grid scrolling
   - Pagination dots update as you scroll
   - "Peek" effect (next card slightly visible)
5. **Test Map-Carousel Sync:**
   - Click map pin → carousel scrolls to that venue's card
   - Click carousel card → map centers on that venue
   - Active pin changes color to green
6. **Test "Show All" Button:**
   - Click "📋 Show all X restaurants"
   - Switches to List view
   - Traditional grid shown with all venues
   - Maintains filter state
7. **Test Filters with Carousel:**
   - Apply vegan filter → carousel updates instantly
   - Only vegan venues in carousel
   - Map pins update to match
8. **Test Responsive:**
   - Resize browser window
   - Carousel adapts (85% width on mobile, 70% on tablet, 45% on desktop)
   - Map stays full-width on mobile, splits on desktop

---

## Filter Testing

### Distance Filters

**Test Each Distance Option:**
```
📍 <500m  → Only venues within 500 meters
📍 <1km   → Only venues within 1 kilometer
📍 <5km   → Only venues within 5 kilometers
```

**Expected Behavior:**
- Results update instantly (<100ms)
- Active filter badge appears: "📍 < 500m"
- Venue count updates in header
- Map pins update to show only filtered venues
- Carousel re-initializes with filtered venues
- GSAP animation on result change

**Test Steps:**
1. Select distance filter
2. Verify badge appears with clear (X) button
3. Count visible results matches header count
4. Verify map pins match filtered count
5. Click X on badge → all venues return

### Vegan Filter

**Test Vegan-Only:**
```
🌱 Vegan → Only restaurants with vegan planted dishes
```

**Expected Behavior:**
- Only venues with `isVegan: true` dishes shown
- Badge: "🌱 Vegan only"
- Results fade out → filter applied → fade in

**Test Steps:**
1. Click "🌱 Vegan" pill
2. Verify only vegan venues shown
3. Check each card has "VEGAN" badge on dishes
4. Verify map/carousel update

### Top Rated Filter

**Test Rating Filter:**
```
⭐ Top Rated → Only 4.5+ star restaurants
```

**Expected Behavior:**
- Only venues with `rating >= 4.5` shown
- Badge: "⭐ 4.5+ rating"

**Test Steps:**
1. Click "⭐ Top Rated" pill
2. Verify all visible venues have 4.5+ stars
3. Check rating badges display correctly

### Combined Filters

**Test Multiple Filters Together:**

**Scenario A: Vegan + Distance**
1. Enable "🌱 Vegan"
2. Enable "📍 <1km"
3. Verify only venues matching BOTH criteria shown
4. Badge: "🌱 Vegan only • 📍 < 1km"

**Scenario B: All Three Filters**
1. Enable Vegan + Distance + Rating
2. Verify strictest filtering (AND logic)
3. Badge shows all active filters
4. Results update on each filter change

---

## Map Interaction Testing

### Pin Clustering

**Test Clustered Pins:**
1. Load high-density area (Zürich 8001)
2. Verify pins cluster when zoomed out
3. Cluster shows number (e.g., "8")
4. Click cluster → zooms in + expands cluster
5. Individual pins revealed

### Pin Highlighting

**Test Active Pin State:**
1. Click carousel card
2. Corresponding map pin turns green
3. Map centers on that pin
4. Pin bounces slightly (GSAP animation)

### Popup Display

**Test Venue Popups:**
1. Click any map pin
2. Popup appears with:
   - Venue name
   - Distance badge
   - Location
3. Popup styled with Planted purple
4. Click outside → popup closes

---

## Carousel Testing

### Snap Scrolling

**Test Snap Behavior:**
1. Swipe carousel slightly
2. Card snaps to center
3. No partial cards shown in center
4. Smooth deceleration (iOS-style)

### Pagination Dots

**Test Dot Navigation:**

**Few Venues (≤10):**
- All dots shown
- Active dot is white pill shape (24px wide)
- Inactive dots are circles (8px)
- Click dot → scrolls to that card

**Many Venues (>10):**
- Smart pagination: `• • • ••• • • •`
- First 3 dots, ellipsis, last 3 dots
- Active dot highlighted

### Keyboard Navigation

**Test Arrow Keys:**
1. Focus carousel
2. Press Right Arrow → next card
3. Press Left Arrow → previous card
4. Smooth scroll animation

---

## Accessibility Testing

### Screen Reader

**Test with NVDA/JAWS/VoiceOver:**

1. **Filter Pills:**
   - Announced as "Button, Vegan filter, not pressed"
   - When active: "Button, Vegan filter, pressed"
   - Clear button: "Button, Clear filter"

2. **Map:**
   - Region labeled: "Interactive map"
   - Pin count announced: "Showing 44 restaurants"

3. **Carousel:**
   - Region labeled: "Restaurant carousel"
   - Dots: "Tab, Slide 1 of 44"
   - Cards announce venue name + distance

4. **Results Count:**
   - `aria-live="polite"` region
   - Updates announced: "Showing 12 of 44 restaurants"

### Keyboard Navigation

**Test Tab Order:**
1. Tab through interface:
   - Results header → Change ZIP button
   - Filter pills (left to right)
   - Map/List toggle
   - Map (focusable)
   - Carousel cards
   - Pagination dots
2. Verify focus visible on all elements (white outline)
3. Test Escape key → closes results overlay

### Reduced Motion

**Test `prefers-reduced-motion`:**

1. Enable reduced motion in OS settings
2. Reload locator
3. Verify:
   - No GSAP animations
   - Instant transitions
   - No blur effects
   - No skeleton pulse animation
   - Carousel scroll still works (CSS smooth-scroll)

---

## Performance Testing

### Load Times

**Measure Performance:**

**Small Result Set (1-6 venues):**
- Target: <500ms to render
- No lazy loading needed

**Medium Result Set (7-15 venues):**
- Target: <800ms to render
- Filter initialization: <100ms

**Large Result Set (16-30 venues):**
- Target: <1.2s total
- Map lazy loads when toggle clicked
- Leaflet.js loaded on-demand (~150KB)

**Very Large Result Set (31+ venues):**
- Target: <1.5s total
- Map skeleton shows immediately
- Leaflet loads asynchronously
- Carousel renders progressively

**Test Steps:**
1. Open DevTools → Performance tab
2. Hard reload page
3. Enter ZIP code
4. Measure time to interactive (TTI)
5. Verify no layout shift (CLS = 0)

### Mobile Performance

**Test on Real Devices:**

**Low-End Device (iPhone 8, 2017):**
- Carousel scroll: 60fps
- Map pan: 30-60fps
- Filter updates: <200ms

**Mid-Range Device (Pixel 5, 2020):**
- All interactions: 60fps

### Memory Usage

**Test Memory Leaks:**
1. Load 50+ venues
2. Apply filters 10 times
3. Toggle map/list 10 times
4. Scroll carousel through all cards
5. Check DevTools → Memory
6. Verify no significant memory growth

---

## Responsive Testing

### Breakpoints

**Mobile (<768px):**
- Carousel: 85% card width + 15% peek
- Map: 350px height
- Filters: Horizontal scroll
- Cards: Single column

**Tablet (768-1023px):**
- Carousel: 70% card width
- Map: 450px height
- Cards: 2-column grid

**Desktop (1024px+):**
- Carousel: 45% card width
- Map: 600px height, sticky on scroll
- Cards: 3-column grid
- Map/List side-by-side option

**Large Desktop (1440px+):**
- Max width: 1600px centered
- 3-4 column grid
- Map takes 55% width, list 45%

---

## Browser Compatibility

### Required Browsers

**Desktop:**
- ✅ Chrome 90+ (Chromium-based)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Mobile:**
- ✅ iOS Safari 14+
- ✅ Chrome Android 90+
- ✅ Samsung Internet 14+

**Test Each Browser:**
1. All 4 adaptive strategies work
2. GSAP animations smooth
3. CSS scroll-snap works
4. Leaflet map renders
5. Touch gestures work (mobile)

---

## Edge Cases & Error Handling

### No Results

**Test Empty Results:**
1. Enter invalid ZIP: `99999`
2. Apply strict filters (no matches)
3. Verify:
   - "No restaurants found" message
   - Friendly copy: "Try another ZIP or location"
   - No broken UI elements

### Slow Network

**Test on 3G:**
1. Throttle to "Slow 3G" in DevTools
2. Enter high-density ZIP
3. Verify:
   - Skeleton screen shows immediately
   - Map placeholder visible
   - "Loading map..." text shown
   - No blank screens
   - Progressive reveal of venues

### Geolocation Errors

**Test Location Denial:**
1. Click "📍 Use Location"
2. Deny permission
3. Verify:
   - Fallback message shown
   - Manual ZIP input still works
   - No console errors

### Map Load Failure

**Test Leaflet CDN Failure:**
1. Block Leaflet CDN in DevTools
2. Load 31+ venues
3. Verify:
   - Graceful degradation to list view
   - "Map unavailable" message
   - Carousel still works

---

## Cross-Feature Integration

### Filter + Map + Carousel Sync

**Test Complete Workflow:**
1. Load Zürich 8001 (44 venues)
2. Click vegan filter → all 3 components update
3. Click map pin → carousel scrolls to venue
4. Swipe carousel → map pin highlights
5. Toggle to List → filter state persists
6. Toggle back to Map → filter still active

**Expected:** All components stay in sync at all times.

---

## Visual Regression Testing

### Screenshot Comparisons

**Capture Screenshots of:**
1. Simple grid (6 venues)
2. Grid + filters (12 venues)
3. Map + grid (20 venues)
4. Map + carousel (44 venues)
5. Mobile carousel view
6. Filter pills active state
7. Map with clustered pins

**Compare Against:** Design mockups and brand guidelines

---

## Analytics & Tracking (Future)

**Events to Track:**
- `locator_view` - Initial page view
- `locator_adaptive_strategy` - Which strategy shown (1-4)
- `locator_filter_applied` - Filter usage
- `locator_map_interaction` - Map clicks
- `locator_carousel_swipe` - Carousel usage
- `locator_view_toggle` - Map/List toggle
- `locator_venue_click` - Card/pin clicks

---

## Known Limitations

1. **Map Requires Internet:** Leaflet tiles need connectivity
2. **Large Venue Counts:** 100+ venues may affect mobile performance
3. **Geolocation Accuracy:** Can be off by 50-100m in urban areas
4. **Browser Support:** IE11 not supported (no CSS Grid/Flexbox fallback)

---

## Success Criteria

### User Experience
- ✅ 31+ venues are NOT overwhelming
- ✅ Map provides spatial context
- ✅ Carousel is discoverable and delightful
- ✅ Filters work intuitively
- ✅ 60fps on modern devices
- ✅ Accessible to keyboard/screen reader users

### Technical
- ✅ No console errors
- ✅ No layout shift (CLS < 0.1)
- ✅ TTI < 2s on 4G
- ✅ Works on all modern browsers
- ✅ Graceful degradation on failures

### Brand Consistency
- ✅ Planted purple/green colors used correctly
- ✅ Galano Grotesque / VC Henrietta fonts
- ✅ Apple-style animations (blur-to-sharp, smooth easing)
- ✅ Consistent with design system

---

## Test Sign-Off Checklist

- [ ] All 4 adaptive strategies tested
- [ ] Filters work correctly (single + combined)
- [ ] Map interactions smooth
- [ ] Carousel swipes naturally
- [ ] Accessibility passes WCAG AA
- [ ] Performance meets targets
- [ ] Responsive on all breakpoints
- [ ] Cross-browser compatible
- [ ] Edge cases handled gracefully
- [ ] Visual design approved

---

## Quick Test Commands

```bash
# Run local dev server
cd planted-astro
npm run dev

# Test URLs
http://localhost:4321/ch-de/  # Zürich (44 venues)
http://localhost:4321/de/     # Germany (many venues)

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Report Issues

If bugs found, report with:
1. **Scenario:** Which venue count strategy (1-6, 7-15, etc.)
2. **Steps to reproduce:** Exact ZIP code + actions
3. **Expected:** What should happen
4. **Actual:** What actually happened
5. **Browser/Device:** Chrome 120 on iPhone 14 Pro, etc.
6. **Screenshots/Video:** Visual proof

---

**Last Updated:** 2025-12-12
**Version:** LocatorV2 with Adaptive Display Strategy
